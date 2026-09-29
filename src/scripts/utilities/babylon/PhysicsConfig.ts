// 物理パラメーター設定
export interface PhysicsParameters {
    mass?: number;
    friction?: number;
    restitution?: number;
    linearDamping?: number;
    angularDamping?: number;
}

// デフォルトの物理パラメーター
export const defaultPhysicsParams: PhysicsParameters = {
    mass: 1.0,
    friction: 0.5,
    restitution: 0.2,
    linearDamping: 0.1,
    angularDamping: 0.1
};

// ボーンタイプ別の物理パラメーター
export const bonePhysicsConfig: Record<string, PhysicsParameters> = {
    // 頭部：軽めで跳ねにくい
    head: {
        mass: 0.8,
        friction: 0.6,
        restitution: 0.1,
        linearDamping: 0.2,
        angularDamping: 0.2
    },
    // 胴体：重めで安定
    torso: {
        mass: 2.0,
        friction: 0.7,
        restitution: 0.1,
        linearDamping: 0.15,
        angularDamping: 0.15
    },
    // 腕：軽めで動きやすい
    arm: {
        mass: 0.5,
        friction: 0.4,
        restitution: 0.15,
        linearDamping: 0.08,
        angularDamping: 0.08
    },
    // 脚：中程度の重さ
    leg: {
        mass: 0.8,
        friction: 0.6,
        restitution: 0.15,
        linearDamping: 0.12,
        angularDamping: 0.12
    },
    // 手足の先端：最も軽い
    extremity: {
        mass: 0.3,
        friction: 0.5,
        restitution: 0.2,
        linearDamping: 0.05,
        angularDamping: 0.05
    }
};

// ボーン名からボーンタイプを判定
export function getBoneType(boneName: string): string {
    const lowerName = boneName.toLowerCase();
    
    if (lowerName.includes('head')) return 'head';
    if (lowerName.includes('spine') || lowerName.includes('hips')) return 'torso';
    if (lowerName.includes('arm') && !lowerName.includes('fore')) return 'arm';
    if (lowerName.includes('forearm') || lowerName.includes('hand')) return 'extremity';
    if (lowerName.includes('upleg') || lowerName.includes('thigh')) return 'leg';
    if (lowerName.includes('leg') && !lowerName.includes('up')) return 'leg';
    if (lowerName.includes('foot')) return 'extremity';
    
    return 'default';
}

// ボーンに適した物理パラメーターを取得
export function getPhysicsParamsForBone(boneName: string): PhysicsParameters {
    const boneType = getBoneType(boneName);
    return bonePhysicsConfig[boneType] || defaultPhysicsParams;
}