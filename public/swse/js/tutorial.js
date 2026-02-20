export const initTutorial = (context = {}) => {
    const COMPLETED_KEY = 'swse_tutorial_completed';
    const PART1_KEY = 'swse_tutorial_part1_completed';

    // If already completed, skip the tutorial
    if (localStorage.getItem(COMPLETED_KEY) === 'true') {
        return;
    }

    if (!window.driver || !window.driver.js) {
        console.warn('Driver.js not loaded');
        return;
    }

    const driver = window.driver.js.driver;
    let steps = [];
    let isPart1 = false;

    if (context.firstRun && !context.hasShip) {
        // Intro Tour
        if (localStorage.getItem(PART1_KEY) === 'true') return;
        isPart1 = true;
        steps = [
            {
                popover: {
                    title: 'Welcome Commander',
                    description: 'Welcome to the SWSE Starship Architect. Let\'s get you started with your first ship.',
                }
            },
            {
                element: '#hangar-dialog-card',
                popover: {
                    title: 'The Hangar',
                    description: 'This is the Hangar where you manage your fleet. To begin, select the "New Stock" tab and choose a chassis.',
                    side: "top",
                    align: 'center'
                }
            },
            {
                element: '#hangar-tab-stock',
                popover: {
                    title: 'Select a Chassis',
                    description: 'Click here to browse available stock ships.',
                    side: "bottom",
                    align: 'start'
                }
            }
        ];
    } else if (context.hasShip) {
        // Main UI Tour
        steps = [
            {
                element: '#tour-stats-panel',
                onHighlightStarted: () => {
                    if (context.isMobile && context.isMobile()) {
                        context.setMobileTab && context.setMobileTab('overview');
                    } else if (context.openLeftDrawer) {
                        context.openLeftDrawer();
                    }
                },
                popover: {
                    title: 'Ship Statistics',
                    description: 'This panel displays your ship\'s vital statistics like HP, SR, Threshold, and Defense scores.',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '#tour-system-list',
                onHighlightStarted: () => {
                    if (context.isMobile && context.isMobile()) {
                        context.setMobileTab && context.setMobileTab('systems');
                    }
                },
                popover: {
                    title: 'Systems Manifest',
                    description: 'Your installed systems, weapons, and modifications are listed here.',
                    side: "left",
                    align: 'start'
                }
            },
            {
                element: '#tour-add-btn',
                onHighlightStarted: () => {
                    if (context.isMobile && context.isMobile()) {
                        context.setMobileTab && context.setMobileTab('systems');
                    }
                },
                popover: {
                    title: 'Install Components',
                    description: 'Click this button to browse and install new weapons, systems, and upgrades.',
                    side: "bottom",
                    align: 'center'
                }
            },
            {
                element: '#tour-config-panel',
                onHighlightStarted: () => {
                    if (context.isMobile && context.isMobile()) {
                        context.setMobileTab && context.setMobileTab('config');
                    } else if (context.openRightDrawer) {
                        context.openRightDrawer();
                    }
                },
                popover: {
                    title: 'Engineering & Config',
                    description: 'Adjust the base chassis, crew quality, and apply templates here. Also manage cargo and escape pods.',
                    side: "left",
                    align: 'start'
                }
            },
            {
                element: '#tour-export-btn',
                popover: {
                    title: 'Save Your Ship',
                    description: 'Don\'t forget to save your work! This downloads a YAML file you can load later.',
                    side: "bottom",
                    align: 'end'
                }
            },
            {
                element: '#tour-hangar-btn',
                popover: {
                    title: 'Hangar',
                    description: 'You can return to the Hangar at any time to load, save, or manage your ships.',
                    side: "bottom",
                    align: 'start'
                }
            }
        ];
    } else {
        return;
    }

    const driverObj = driver({
        showProgress: true,
        allowClose: true,
        animate: true,
        steps: steps,
        onDestroyStarted: () => {
            if (isPart1) {
                localStorage.setItem(PART1_KEY, 'true');
            } else {
                localStorage.setItem(COMPLETED_KEY, 'true');
            }
            document.body.classList.remove('tour-active');
            driverObj.destroy();
        }
    });

    document.body.classList.add('tour-active');
    driverObj.drive();
};
