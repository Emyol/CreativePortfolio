/**
 * Runs in <head> before first paint: where WebGL2 exists, marks the page as waiting for the
 * 3D (html[data-gl="pending"]), so the flat drawings can stay hidden until it arrives or the
 * CSS failsafe shows them (lib/three/support).
 */
export const GL_PREPAINT = `try{if(typeof WebGL2RenderingContext!=="undefined")document.documentElement.dataset.gl="pending"}catch(e){}`;
