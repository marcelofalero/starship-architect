export const initTutorial = () => {
    const COMPLETED_KEY = 'swse_tutorial_completed';

    // Check for "noob=true" in the query string
    const urlParams = new URLSearchParams(window.location.search);
    const forceTutorial = urlParams.get('noob') === 'true';

    // If not forced and already completed, skip the tutorial
    if (!forceTutorial && localStorage.getItem(COMPLETED_KEY) === 'true') {
        return;
    }

    if (!window.driver || !window.driver.js) {
        console.warn('Driver.js not loaded');
        return;
    }

    const driver = window.driver.js.driver;

    const driverObj = driver({
        showProgress: true,
        allowClose: true,
        animate: true,
        steps: [
            {
                popover: {
                    title: 'Welcome Commander',
                    description: 'Welcome to the SWSE Starship Architect. Let\'s take a quick tour of the controls to get you started.',
                }
            },
            {
                element: '#tour-hangar-btn',
                popover: {
                    title: 'Hangar',
                    description: 'Start here. Select a stock ship from the library or load a saved ship file.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#tour-stats-panel',
                popover: {
                    title: 'Ship Statistics',
                    description: 'This panel displays your ship\'s vital statistics like HP, SR, Threshold, and Defense scores.',
                    side: "right",
                    align: 'start'
                }
            },
            {
                element: '#tour-system-list',
                popover: {
                    title: 'Systems Manifest',
                    description: 'Your installed systems, weapons, and modifications are listed here.',
                    side: "left",
                    align: 'start'
                }
            },
            {
                element: '#tour-add-btn',
                popover: {
                    title: 'Install Components',
                    description: 'Click this button to browse and install new weapons, systems, and upgrades.',
                    side: "bottom",
                    align: 'center'
                }
            },
            {
                element: '#tour-config-panel',
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
            }
        ],
        onDestroyStarted: () => {
            localStorage.setItem(COMPLETED_KEY, 'true');
            document.body.classList.remove('tour-active');
            driverObj.destroy();
        }
    });

    document.body.classList.add('tour-active');
    driverObj.drive();
};
