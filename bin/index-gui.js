// Hotfix for https://github.com/nodejs/node/issues/30039
'use strict';
require('module').wrapper[0] += `'use strict';`;

const SupportURL = 'https://discord.gg/CZMYNhXwwS';

const { app } = require('electron');
const path = require('path');

// Utility
function dialogAndQuit(data) {
    const { dialog } = require('electron');
    dialog.showMessageBoxSync(data);
    app.exit();
}

// Splash Screen
let SplashScreen = null;
let SplashScreenShowTime = 0;

function showSplashScreen() {
    try {
        const guiRoot = path.join(__dirname, 'gui');
        const guiIcon = path.join(guiRoot, '/assets/icon.ico');

        const { BrowserWindow } = require('electron');
        SplashScreen = new BrowserWindow({
            title: 'TERA Toolbox',
            width: 880,
            height: 500,
            minWidth: 880,
            minHeight: 500,
            icon: guiIcon,
            frame: false,
            backgroundColor: '#292F33',
            resizable: false,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,
                devTools: false
            }
        });

        SplashScreen.loadFile(path.join(guiRoot, 'splash.html'));
        SplashScreen.once('ready-to-show', () => SplashScreen.show());
        SplashScreenShowTime = Date.now();
    } catch (e) {
        // Ignore any error resulting from splash screen
        SplashScreen = null;
    }
}

function hideSplashScreen(onDone) {
    setTimeout(() => {
        onDone().then(() => {
            if (SplashScreen) {
                SplashScreen.close();
                SplashScreen = null;
            }
        });
    }, SplashScreen ? Math.max(0, 1500 - (Date.now() - SplashScreenShowTime)) : 0);
}

function setSplashScreenCaption(caption) {
    if (SplashScreen)
        SplashScreen.webContents.send('caption', caption);
}

function setSplashScreenInfo(info) {
    if (SplashScreen)
        SplashScreen.webContents.send('info', info);
}

// Update
async function updateSelf() {
    delete require.cache[require.resolve('./update-self')];
    const Updater = require('./update-self');

    let errors = [];

    const updater = new Updater(branch);
    updater.on('run_start', () => {
        console.log(`[update] Self-update started (Branch: ${updater.branch})`);

        setSplashScreenCaption('Running self-update...');
        setSplashScreenInfo('');
    });

    updater.on('check_start', (serverIndex) => {
        if (updatelog)
            console.log(`[update] Update check started (Server: ${serverIndex})`);

        setSplashScreenCaption('Checking for updates...');
        setSplashScreenInfo(`Server ${serverIndex}`);
    });
    updater.on('check_success', (serverIndex, operations) => {
        if (updatelog)
            console.log(`[update] Update check finished (Server: ${serverIndex}), ${operations.length} operations required`);

        setSplashScreenCaption('Update check finished!');
        setSplashScreenInfo(`Server ${serverIndex}`);
    });
    updater.on('check_fail', (serverIndex, e) => {
        // errors.push(`TERA Toolbox was unable to check for updates on server ${serverIndex}!\n${e}`);
        console.log(`[update] Update check failed (Server: ${serverIndex}): ${e}`);

        setSplashScreenCaption(`Update check failed (server ${serverIndex})!`);
    });
    updater.on('check_fail_all', () => {
        errors.push(`TERA Toolbox was unable to check for updates using any server!\nThis is most likely an issue caused by your internet connection or your system configuration.`);
        console.log('[update] Update check failed');

        setSplashScreenCaption('Update check failed!');
    });

    updater.on('prepare_start', () => {
        if (updatelog)
            console.log(`[update] Update download and preparation started`);

        setSplashScreenCaption('Preparing update...');
        setSplashScreenInfo('');
    });
    updater.on('download_start', (serverIndex, relpath) => {
        if (updatelog)
            console.log(`[update] - Download: ${relpath} (Server: ${serverIndex})`);

        setSplashScreenCaption(`Downloading update (server ${serverIndex})...`);
        setSplashScreenInfo(relpath);
    });
    updater.on('download_error', (relpath, expected_hash, downloaded_hash) => {
        console.log(`[update] - Error downloading ${relpath}: file hash mismatch (expected: ${expected_hash}, found: ${downloaded_hash})!`);

        setSplashScreenCaption('Error downloading update!');
        setSplashScreenInfo(relpath);

        errors.push(`File hash mismatch in downloaded file "${relpath}"!\nExpected: ${expected_hash}\nFound: ${downloaded_hash}`);
    });
    updater.on('prepare_finish', () => {
        if (updatelog)
            console.log(`[update] Update download and preparation finished`);

        setSplashScreenCaption('Update prepared!');
        setSplashScreenInfo('');
    });

    updater.on('execute_start', () => {
        if (updatelog)
            console.log(`[update] Update installation started`);

        setSplashScreenCaption('Installing update...');
        setSplashScreenInfo('');
    });
    updater.on('install_start', (relpath) => {
        if (updatelog)
            console.log(`[update] - Install: ${relpath}`);

        setSplashScreenCaption('Installing update...');
        setSplashScreenInfo(relpath);
    });
    updater.on('install_error', (relpath, e) => {
        console.log(`[update] - Error installing ${relpath}: ${e}`);
        if (relpath.startsWith('node_modules/tera-client-interface/scanner/')) {
            console.log('[update] - Your anti-virus software most likely falsely detected it to be a virus.');
            console.log('[update] - Please whitelist TERA Toolbox in your anti-virus!');
        } else if (relpath === 'node_modules/tera-client-interface/tera-client-interface.dll') {
            console.log('[update] - This is most likely caused by an instance of the game that is still running.');
            console.log('[update] - Close all game clients or restart your computer, then try again!');
        }

        setSplashScreenCaption('Error installing update!');
        setSplashScreenInfo(relpath);

        if (relpath.startsWith('node_modules/tera-client-interface/scanner/'))
            errors.push(`Unable to install "${relpath}"!\n${e}\n\nYour anti-virus software most likely falsely detected TERA Toolbox to be a virus.\nPlease whitelist it!`);
        else if (relpath === 'node_modules/tera-client-interface/tera-client-interface.dll')
            errors.push(`Unable to install "${relpath}"!\n${e}\n\nThis is most likely caused by an instance of the game client that is still running.\nClose all game clients or restart your computer, then try again!`);
        else
            errors.push(`Unable to install "${relpath}"!\n${e}`);
    });
    updater.on('execute_finish', () => {
        if (updatelog)
            console.log(`[update] Update installation finished`);

        setSplashScreenCaption('Update installed!');
        setSplashScreenInfo('');
    });

    updater.on('run_finish', (success) => {
        console.log(`[update] Self-update ${success ? 'finished' : 'failed'}`);

        setSplashScreenCaption(`Self-update ${success ? 'finished' : 'failed'}!`);
        setSplashScreenInfo('');
    });

    const filesChanged = await updater.run();
    if (errors.length > 0)
        return errors;
    if (filesChanged)
        return await updateSelf();
    return null;
}

// Main function
async function run() {
    const start = require('./loader-gui');
    await start();
}

function main() {
    if (noselfupdate) {
        run();
    } else {
        // Show splash screen
        showSplashScreen();

        // Perform self-update
        updateSelf().then(errors => {
            if (errors && errors.length > 0) {
                let errmsg = `TERA Toolbox was unable to update itself. If the problem persists, ask here ${SupportURL} for help!\n\nThe full error message is:\n\n------------------------------\n`;
                errmsg += errors.join('\n------------------------------\n');
                errmsg += '\n------------------------------\n\nThe program will now be terminated.';

                dialogAndQuit({
                    type: 'error',
                    title: 'Self-update error!',
                    message: errmsg
                });
            } else {
                const { updateRequired, update } = require('./update-electron.js');
                if (updateRequired()) {
                    setSplashScreenCaption('Downloading Electron update...');
                    setSplashScreenInfo('');

                    update().then(() => {
                        app.exit();
                    }).catch(e => {
                        dialogAndQuit({
                            type: 'error',
                            title: 'Electron update error!',
                            message: `TERA Toolbox was unable to update Electron. If the problem persists, ask here ${SupportURL} for help!\n\nThe full error message is:\n${e}\n\nThe program will now be terminated.`
                        });
                    });
                } else {
                    hideSplashScreen(run);
                }
            }
        }).catch(e => {
            dialogAndQuit({
                type: 'error',
                title: 'Self-update error!',
                message: `TERA Toolbox was unable to update itself. If the problem persists, ask here ${SupportURL} for help!\n\nThe full error message is:\n${e}\n\nThe program will now be terminated.`
            });
        });
    }
}

// -------------------------------------------------------------------
// Safely load configuration
let branch = 'master';
let updatelog = false;
let noselfupdate = false;
try {
    const config = require('./config').loadConfig();
    if (config) {
        if (config.branch)
            branch = config.branch.toLowerCase();
        updatelog = !!config.updatelog;
        noselfupdate = !!config.noselfupdate;
    }
} catch (_) {
    console.warn('[update] WARNING: An error occurred while trying to read the config file! Falling back to default values.');
}

// Backwards compatibility until next major update
//app.allowRendererProcessReuse = false;

// Boot
if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
}

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("force_low_power_gpu");

if (app.isReady())
    main();
else
    app.on('ready', main);
