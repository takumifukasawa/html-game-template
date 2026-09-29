import { Axis } from "@babylonjs/core";
import type { ExtendedRagdollBoneProperties } from "./RagdollConfigTypes.ts";

// mixamo用のラグドール設定
export const mixamoRagdollConfig: ExtendedRagdollBoneProperties[] = [
    { bones: ["mixamorig:Hips"], size: 0.25, boxOffset: 0.01 },
    {
        bones: ["mixamorig:Spine2"],
        size: 0.3,
        boxOffset: 0.05,
        boneOffsetAxis: Axis.Y,
        min: -1,
        max: 1,
        rotationAxis: Axis.Z
    },
    // Arms
    {
        bones: ["mixamorig:LeftArm", "mixamorig:RightArm"],
        depth: 0.1,
        size: 0.1,
        width: 0.2,
        rotationAxis: Axis.Y,
        //min: -1,
        //max: 1,
        boxOffset: 0.10,
        boneOffsetAxis: Axis.Y
    },
    {
        bones: ["mixamorig:LeftForeArm", "mixamorig:RightForeArm"],
        depth: 0.1,
        size: 0.1,
        width: 0.2,
        rotationAxis: Axis.Y,
        min: -1,
        max: 1,
        boxOffset: 0.12,
        boneOffsetAxis: Axis.Y
    },
    // Legs
    {
        bones: ["mixamorig:LeftUpLeg", "mixamorig:RightUpLeg"],
        depth: 0.2,
        size: 0.3,
        width: 0.15,
        rotationAxis: Axis.Y,
        min: -1,
        max: 1,
        boxOffset: 0.2,
        boneOffsetAxis: Axis.Y
    },
    {
        bones: ["mixamorig:LeftLeg", "mixamorig:RightLeg"],
        depth: 0.15,
        size: 0.6,
        width: 0.1,
        rotationAxis: Axis.Y,
        min: -1,
        max: 1,
        boxOffset: 0.25,
        boneOffsetAxis: Axis.Y
    },
    {
        bones: ["mixamorig:LeftHand", "mixamorig:RightHand"],
        depth: 0.15,
        size: 0.1,
        width: 0.2,
        rotationAxis: Axis.Y,
        min: -1,
        max: 1,
        boxOffset: 0.05,
        boneOffsetAxis: Axis.Y
    },
    // Head
    {
        bones: ["mixamorig:Head"],
        size: 0.3,
        boxOffset: 0.1,
        boneOffsetAxis: Axis.Y,
        min: -1,
        max: 1,
        rotationAxis: Axis.Z,
    }
];