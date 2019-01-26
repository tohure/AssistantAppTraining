'use strict';

// Import Google Debugger
const debug = require('@google-cloud/debug-agent').start({
    allowExpressions: true,
    serviceContext: {
        service: 'gcf-code-colors',
        version: 'v2.0.1'
    }
});
let debugInitialized;

// Import the Dialogflow module and response creation dependencies
// from the Actions on Google client library.
const {
    dialogflow,
    BasicCard,
    Permission,
    Suggestions,
    Carousel,
    Image,
} = require('actions-on-google');

// Import dependencies for the i18n-node
const i18n = require('i18n');

// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');

// Instantiate the Dialogflow client.
const app = dialogflow({
    debug: true
});

// Configure Locales
i18n.configure({
    directory: __dirname + '/locales',
    objectNotation: true,
    fallbacks: {
        'es-419': 'es',
        'es-ES': 'es',
        'es-MX': 'es',
        'es-US': 'es',
        'es-PE': 'es',
    },
});

// Configure i18n locale in middleware and debuger Initializer
app.middleware((conv) => {
    i18n.setLocale(conv.user.locale);
    debugInitialized = false;
});

// Deep Link Test intents
app.intent('test', (conv) => {
    conv.close(i18n.__('test', conv.user.locale));
});

// Handle the Dialogflow intent named 'Default Welcome Intent'.
app.intent('Default Welcome Intent', (conv) => {

    const name = conv.user.storage.userName;
    if (!name) {
        // Asks the user's permission to know their name, for personalization.
        conv.ask(new Permission({
            context: `${i18n.__('permissions.context')}`,
            permissions: 'NAME'
        }));
    } else {
        conv.ask(i18n.__(
            'askForColors.grettingAgain',
            getSplitName(name)));
        conv.ask(new Suggestions(
            i18n.__('baseColors.red'),
            i18n.__('baseColors.blue'),
            i18n.__('baseColors.green')));
    }

    checkDebugger()
});

// Handle the Dialogflow intent named 'actions_intent_PERMISSION'. If user
// agreed to PERMISSION prompt, then boolean value 'permissionGranted' is true.
app.intent('actions_intent_PERMISSION', (conv, params, permissionGranted) => {
    if (!permissionGranted) {
        conv.ask(i18n.__(
            'askForColors.withoutPermissions'));
    } else {
        conv.user.storage.userName = conv.user.name.display;
        conv.ask(i18n.__(
            'askForColors.withPermissions',
            getSplitName(conv.user.storage.userName)));
    }
    conv.ask(new Suggestions(
        i18n.__('baseColors.red'),
        i18n.__('baseColors.blue'),
        i18n.__('baseColors.green')));

    checkDebugger()
});

// Handle the Dialogflow intent named 'favorite color'.
// The intent collects a parameter named 'color'.
app.intent('favorite color', (conv, {
    color
}) => {
    const luckyNumber = color.length;
    const audioSound = 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg';

    if (conv.user.storage.userName) {
        // If we collected user name previously,
        // address them by name and use SSML
        // to embed an audio snippet in the response.
        conv.ask(i18n.__('responseForColors.withPermissions',
            getSplitName(conv.user.storage.userName),
            luckyNumber,
            audioSound));
    } else {
        conv.ask(i18n.__('responseForColors.withoutPermissions',
            luckyNumber,
            audioSound));
    }
    conv.ask(new Suggestions(i18n.__('options.yes'), 'No'));
    checkDebugger()
});

// Handle the Dialogflow follow-up intents
app.intent(['favorite color - yes', 'favorite fake color - yes'], (conv) => {
    conv.ask(i18n.__('askForColors.fakeColorAsk'));
    // If the user is using a screened device, display the carousel
    if (conv.screen) conv.ask(fakeColorCarousel());
    checkDebugger()
});

// Handle the Dialogflow intent named 'favorite fake color'.
// The intent collects a parameter named 'fakeColor'.
app.intent('favorite fake color', (conv, {
    fakeColor
}) => {
    fakeColor = conv.arguments.get('OPTION') || fakeColor;
    // Present user with the corresponding basic card and end the conversation.
    if (!conv.screen) {
        conv.ask(colorMap[fakeColor].text);
    } else {
        conv.ask(i18n.__('responseForFakeColor'), new BasicCard(colorMap[fakeColor]));
    }
    conv.ask(i18n.__('fakeColors.another'));
    conv.ask(new Suggestions(i18n.__('options.yes'), 'No'));
    checkDebugger()
});

// Handle the Dialogflow NO_INPUT intent.
// Triggered when the user doesn't provide input to the Action
app.intent('actions_intent_NO_INPUT', (conv) => {

    // Use the number of reprompts to vary response
    const repromptCount = parseInt(conv.arguments.get('REPROMPT_COUNT'));
    if (repromptCount === 0) {
        conv.ask(i18n.__('noInputReprompt.firstAsk'));
    } else if (repromptCount === 1) {
        conv.ask(i18n.__('noInputReprompt.secondAsk'));
    } else if (conv.arguments.get('IS_FINAL_REPROMPT')) {
        conv.close(i18n.__('noInputReprompt.sorryTrouble'));
    }
    checkDebugger()
});

// Define a mapping of fake color strings to basic card objects.
const colorMap = {
    'indigo taco': {
        title: 'Indigo Taco',
        text: 'Indigo Taco is a subtle bluish tone.',
        image: {
            url: 'https://storage.googleapis.com/material-design/publish/material_v_12/assets/0BxFyKV4eeNjDN1JRbF9ZMHZsa1k/style-color-uiapplication-palette1.png',
            accessibilityText: 'Indigo Taco Color',
        },
        display: 'WHITE',
    },
    'pink unicorn': {
        title: 'Pink Unicorn',
        text: 'Pink Unicorn is an imaginative reddish hue.',
        image: {
            url: 'https://storage.googleapis.com/material-design/publish/material_v_12/assets/0BxFyKV4eeNjDbFVfTXpoaEE5Vzg/style-color-uiapplication-palette2.png',
            accessibilityText: 'Pink Unicorn Color',
        },
        display: 'WHITE',
    },
    'blue grey coffee': {
        title: 'Blue Grey Coffee',
        text: 'Calling out to rainy days, Blue Grey Coffee brings to mind your favorite coffee shop.',
        image: {
            url: 'https://storage.googleapis.com/material-design/publish/material_v_12/assets/0BxFyKV4eeNjDZUdpeURtaTUwLUk/style-color-colorsystem-gray-secondary-161116.png',
            accessibilityText: 'Blue Grey Coffee Color',
        },
        display: 'WHITE',
    },
};

// In the case the user is interacting with the Action on a screened device
// The Fake Color Carousel will display a carousel of color cards
const fakeColorCarousel = () => {
    const carousel = new Carousel({
        items: {
            'indigo taco': {
                title: 'Indigo Taco',
                synonyms: ['indigo', 'taco'],
                image: new Image({
                    url: 'https://storage.googleapis.com/material-design/publish/material_v_12/assets/0BxFyKV4eeNjDN1JRbF9ZMHZsa1k/style-color-uiapplication-palette1.png',
                    alt: 'Indigo Taco Color',
                }),
            },
            'pink unicorn': {
                title: 'Pink Unicorn',
                synonyms: ['pink', 'unicorn'],
                image: new Image({
                    url: 'https://storage.googleapis.com/material-design/publish/material_v_12/assets/0BxFyKV4eeNjDbFVfTXpoaEE5Vzg/style-color-uiapplication-palette2.png',
                    alt: 'Pink Unicorn Color',
                }),
            },
            'blue grey coffee': {
                title: 'Blue Grey Coffee',
                synonyms: ['blue', 'grey', 'coffee'],
                image: new Image({
                    url: 'https://storage.googleapis.com/material-design/publish/material_v_12/assets/0BxFyKV4eeNjDZUdpeURtaTUwLUk/style-color-colorsystem-gray-secondary-161116.png',
                    alt: 'Blue Grey Coffee Color',
                }),
            },
        }
    });
    return carousel;
};

function getSplitName(name) {

    const splitName = name.split(' ');

    return splitName[0];
}

function checkDebugger() {
    if (!debugInitialized) {
        return debug.isReady().then(() => {
            debugInitialized = true
        });
    }
}

// Set the DialogflowApp object to handle the HTTPS POST request.
exports.codeColorTohure = functions.https.onRequest(app);