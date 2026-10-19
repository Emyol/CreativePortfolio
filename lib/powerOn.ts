import { REDUCE_QUERY } from "./motion/tier";

export const POWER_KEY = "side-a:powered";

/**
 * Runs in <head> before first paint: on the first visit of a session to the top of the
 * home page, the hero's screen starts dark so the power-on can light it. If JS never takes
 * over, a CSS failsafe lights it after 3 s anyway.
 */
export const POWER_PREPAINT = `try{var d=document.documentElement;if(location.pathname==="/"&&!location.hash&&!matchMedia(${JSON.stringify(REDUCE_QUERY)}).matches&&sessionStorage.getItem(${JSON.stringify(POWER_KEY)})!=="1")d.dataset.boot="pending"}catch(e){}`;

/**
 * Runs in <head> before first paint: where WebGL2 exists the 3D player is expected, so the
 * flat (sprite) device is never painted first; it shows only if the 3D turns out unable to
 * run or fails (components/three/Hero3D.tsx clears or overrides this), or after a CSS
 * failsafe if the page's script never runs.
 */
export const GL_PREPAINT = `try{if(typeof WebGL2RenderingContext!=="undefined")document.documentElement.dataset.gl="pending"}catch(e){}`;
