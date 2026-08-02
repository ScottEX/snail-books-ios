// ── Avatar-changed event: ProfileScreen uploads → HomeScreen header reloads ──
const avatarListeners = new Set<() => void>();

export const onAvatarChanged = (fn: () => void) => {
  avatarListeners.add(fn);
  return () => { avatarListeners.delete(fn); };
};

export const emitAvatarChanged = () => { avatarListeners.forEach(f => f()); };
