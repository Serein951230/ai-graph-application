export function isVideoComplete(currentTime, duration) {
    const watched = Number(currentTime);
    const total = Number(duration);
    if (!Number.isFinite(watched) || !Number.isFinite(total) || total <= 0 || watched < 0) return false;
    const tolerance = Math.min(3, total * 0.03);
    return watched >= total - tolerance;
}
