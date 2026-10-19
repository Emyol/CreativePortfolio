import { REDUCE_QUERY } from "./motion/tier";

/**
 * Runs in <head> before first paint: on every load of the top of the home page (a reload
 * too), the page opens dark so the entrance can light it, from the top of the page. Not at
 * a deep link (a hash), not under reduced motion, and not coming back within the site (no
 * page load). If JS never takes over, a CSS failsafe lifts the dark anyway.
 */
export const POWER_PREPAINT = `try{var d=document.documentElement;if(location.pathname==="/"&&!location.hash&&!matchMedia(${JSON.stringify(REDUCE_QUERY)}).matches){d.dataset.boot="pending";history.scrollRestoration="manual";scrollTo(0,0)}}catch(e){}`;

export const GL_PREPAINT = `try{if(typeof WebGL2RenderingContext!=="undefined")document.documentElement.dataset.gl="pending"}catch(e){}`;
