export function getTextWidth(text, font = '14px sans-serif') {
    // Force the Canvas resolution.
    const canvas = document.createElement('canvas');
    canvas.width = 2000; // Use a sufficiently large canvas.
    canvas.style.width = '1000px'; // Avoid interference from CSS scaling.
    const ctx = canvas.getContext('2d');
    ctx.font = font;
    return ctx.measureText(text).width;
}
