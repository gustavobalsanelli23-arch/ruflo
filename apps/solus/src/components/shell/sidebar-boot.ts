/** localStorage key for the desktop sidebar choice (see sidebar-state.ts). */
export const SIDEBAR_KEY = 'solus-sidebar';

/** Runs before paint so a collapsed sidebar never flashes open. */
export const SIDEBAR_BOOT_SCRIPT = `try{if(localStorage.getItem('${SIDEBAR_KEY}')==='collapsed')document.documentElement.dataset.sidebar='collapsed'}catch(e){}`;
