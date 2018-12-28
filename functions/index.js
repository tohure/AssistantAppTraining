'use strict';

// Import Google Debugger
const debug = require('@google-cloud/debug-agent');
debug.start({ allowExpressions: true });

// Import the Dialogflow module and response creation dependencies
// from the Actions on Google client library.
const {
    dialogflow,
    BasicCard,
    Permission,
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

// Configure i18n locale in middleware
app.middleware((conv) => {
    i18n.setLocale(conv.user.locale);
});

// Deep Link Test intents
app.intent('test', (conv) => { // must not be async for i18n
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
        conv.ask(`Hi again, ${name}. What's your favorite color?`);
    }
});

// Handle the Dialogflow intent named 'actions_intent_PERMISSION'. If user
// agreed to PERMISSION prompt, then boolean value 'permissionGranted' is true.
app.intent('actions_intent_PERMISSION', (conv, params, permissionGranted) => {
    if (!permissionGranted) {
        conv.ask(i18n.__(
            'askForColors.withoutPermissions'));
    } else {
        conv.ask(i18n.__(
            'askForColors.withPermissions',
            conv.user.name.display));
    }
});

// Handle the Dialogflow intent named 'favorite color'.
// The intent collects a parameter named 'color'.
app.intent('favorite color', (conv, { color }) => {
    const luckyNumber = color.length;
    const audioSound = 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg';

    if (conv.user.storage.userName) {
        // If we collected user name previously,
        // address them by name and use SSML
        // to embed an audio snippet in the response.
        conv.ask(i18n.__('responseForColors.withPermissions',
            conv.user.storage.userName,
            luckyNumber,
            audioSound));
    } else {
        conv.ask(i18n.__('responseForColors.withoutPermissions',
            luckyNumber,
            audioSound));
    }
});

// Handle the Dialogflow intent named 'favorite fake color'.
app.intent('favorite fake color', (conv, { fakeColor }) => {
    conv.close(i18n.__('responseForFakeColor'), colorMap[fakeColor]);
});

// Define a mapping of fake color strings to basic card objects.
const colorMap = {
    'indigo taco': new BasicCard({
        title: 'Indigo Taco',
        image: {
            url: 'https://storage.googleapis.com/material-design/publish/material_v_12/assets/0BxFyKV4eeNjDN1JRbF9ZMHZsa1k/style-color-uiapplication-palette1.png',
            accessibilityText: 'Indigo Taco Color',
        },
        display: 'WHITE',
    }),
    'pink unicorn': new BasicCard({
        title: 'Pink Unicorn',
        image: {
            url: 'https://storage.googleapis.com/material-design/publish/material_v_12/assets/0BxFyKV4eeNjDbFVfTXpoaEE5Vzg/style-color-uiapplication-palette2.png',
            accessibilityText: 'Pink Unicorn Color',
        },
        display: 'WHITE',
    }),
    'blue grey coffee': new BasicCard({
        title: 'Blue Grey Coffee',
        image: {
            url: 'https://storage.googleapis.com/material-design/publish/material_v_12/assets/0BxFyKV4eeNjDZUdpeURtaTUwLUk/style-color-colorsystem-gray-secondary-161116.png',
            accessibilityText: 'Blue Grey Coffee Color',
        },
        display: 'WHITE',
    }),
};

// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
