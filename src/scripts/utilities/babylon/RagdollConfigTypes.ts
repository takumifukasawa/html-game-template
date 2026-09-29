import type { RagdollBoneProperties } from "@babylonjs/core";

// Babylon.jsのRagdollBonePropertiesを拡張
export interface ExtendedRagdollBoneProperties extends RagdollBoneProperties {
    bones: string[];
}