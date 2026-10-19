import { REDUCE_QUERY } from "./motion/tier";

/**
 * Runs in <head> before first paint: on every load of the top of the home page (a reload
 * too), the page opens dark so the entrance can light it, from the top of the page. Not at
 * a deep link (a hash), not under reduced motion, not coming back within the site (no page
 * load), and not with Back or Forward from another site (the visitor returns to their place).
 * The home page keeps its own scroll (manual), so a reload starts at the top; HashLinks puts
 * visitors back on Back and Forward.
 * If JS never takes over, a CSS failsafe lifts the dark anyway.
 */
export const POWER_PREPAINT = `try{var d=document.documentElement,n=performance.getEntriesByType("navigation")[0];if(location.pathname==="/"&&!location.hash&&!(n&&n.type==="back_forward")&&!matchMedia(${JSON.stringify(REDUCE_QUERY)}).matches){d.dataset.boot="pending";history.scrollRestoration="manual";scrollTo(0,0)}}catch(e){}`;

export const GL_PREPAINT = `try{if(typeof WebGL2RenderingContext!=="undefined")document.documentElement.dataset.gl="pending"}catch(e){}`;
