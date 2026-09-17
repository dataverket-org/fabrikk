import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.13";
import {
  type ExecResult,
  imageRefs,
  pinnedImages,
  setRuntime,
  violations,
  waitForArtifact,
} from "./release_artifact.ts";

const COMMIT = "6bf9d587038efcc302b2e801b5ecb8503e34d4c7";
const MILJO = "052693e0cb6212457fcd8986d52beaae6e1b04e5";
const API = "sha256:" + "4".repeat(64);
const WORKER = "sha256:" + "5".repeat(64);

const args = {
  registry: "registry.example.org",
  product: "sentral",
  environment: "uat",
  commit: COMMIT,
  publicKey: "cosign.pub",
  timeoutSeconds: 60,
  intervalSeconds: 10,
};

const manifest = () => ({
  config: { mediaType: "application/vnd.cncf.flux.config.v1+json" },
  layers: [{ mediaType: "application/vnd.cncf.flux.content.v1.tar+gzip" }],
  annotations: { "org.opencontainers.image.revision": `main@sha1:${COMMIT}` },
});

const release = () => ({
  product: "sentral",
  environment: "uat",
  app_commit: COMMIT,
  env_config_version: MILJO,
  images: { "sentral-api": API, "sentral-worker": WORKER },
});

const manifests = `
spec:
  containers:
    - image: registry.example.org/sentral/sentral-api:${COMMIT}@${API}
    - name: worker
      image: "registry.example.org/sentral/sentral-worker@${WORKER}"
`;

Deno.test("a release built from the commit, pinned by digest, has no violations", () => {
  assertEquals(violations(args, manifest(), release(), manifests), []);
});

Deno.test("an artifact from another commit, product, or environment is rejected", () => {
  const m = manifest();
  m.annotations["org.opencontainers.image.revision"] = "main@sha1:" +
    "0".repeat(40);
  const r = release();
  r.product = "objekt";
  r.environment = "prod";
  r.app_commit = "0".repeat(40);
  r.env_config_version = "main";
  assertEquals(violations(args, m, r, manifests), [
    `revision annotation is "main@sha1:${
      "0".repeat(40)
    }", not built from ${COMMIT}`,
    "release.json product is objekt",
    "release.json environment is prod",
    `release.json app_commit is ${"0".repeat(40)}, not ${COMMIT}`,
    'release.json env_config_version "main" is not a miljo commit',
  ]);
});

Deno.test("an unpinned image or a manifest/release.json mismatch is rejected", () => {
  const r = release();
  r.images["sentral-worker"] = "sha256:" + "6".repeat(64);
  const unpinned = manifests +
    "    - image: registry.example.org/sentral/debug:latest\n";
  assertEquals(violations(args, manifest(), r, unpinned), [
    "manifests.yaml image not pinned by digest: registry.example.org/sentral/debug:latest",
    `image sentral-worker: manifests.yaml has ${WORKER}, release.json has sha256:${
      "6".repeat(64)
    }`,
  ]);
});

Deno.test("something that is not a Flux artifact with a release.json is rejected", () => {
  assertEquals(
    violations(
      args,
      {
        config: { mediaType: "application/vnd.oci.image.config.v1+json" },
        layers: [],
      },
      undefined,
      "",
    ),
    [
      "not a Flux config artifact: config media type application/vnd.oci.image.config.v1+json",
      "expected exactly one Flux content layer",
      'revision annotation is "", not built from ' + COMMIT,
      "release.json is missing or not valid JSON",
    ],
  );
});

Deno.test("imageRefs and pinnedImages handle tags, quotes, and list items", () => {
  const refs = imageRefs(manifests);
  assertEquals(refs.length, 2);
  assertEquals(pinnedImages(refs), {
    images: { "sentral-api": API, "sentral-worker": WORKER },
    unpinned: [],
  });
});

function fakeCrane(results: ExecResult[]) {
  const calls: string[][] = [];
  const sleeps: number[] = [];
  setRuntime(
    (argv) => {
      calls.push(argv);
      return Promise.resolve(results.shift()!);
    },
    (ms) => {
      sleeps.push(ms);
      return Promise.resolve();
    },
  );
  return { calls, sleeps };
}

const out = (s: string): ExecResult => ({
  code: 0,
  stdout: new TextEncoder().encode(s + "\n"),
  stderr: "",
});
const missing: ExecResult = {
  code: 1,
  stdout: new Uint8Array(),
  stderr: "MANIFEST_UNKNOWN",
};

Deno.test("waitForArtifact polls until CI has published the commit", async () => {
  const { calls, sleeps } = fakeCrane([missing, missing, out(API)]);
  try {
    const digest = await waitForArtifact(
      "crane",
      "r/sentral/config-uat",
      COMMIT,
      60,
      10,
    );
    assertEquals(digest, API);
    assertEquals(calls[0], [
      "crane",
      "digest",
      `r/sentral/config-uat:${COMMIT}`,
    ]);
    assertEquals(sleeps, [10_000, 10_000]);
  } finally {
    setRuntime();
  }
});

Deno.test("waitForArtifact gives up with the last registry error", async () => {
  const { calls } = fakeCrane([missing, missing, missing]);
  try {
    await assertRejects(
      () => waitForArtifact("crane", "r/sentral/config-uat", COMMIT, 15, 10),
      Error,
      `no release artifact r/sentral/config-uat:${COMMIT} after 15s; check the CI release run for ${COMMIT}. Last error: MANIFEST_UNKNOWN`,
    );
    assertEquals(calls.length, 2);
  } finally {
    setRuntime();
  }
});
