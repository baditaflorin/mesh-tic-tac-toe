import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-tic-tac-toe",
  description: "Classic tic-tac-toe over the mesh, no account, rematch built in",
  accentHex: "#10b981",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
