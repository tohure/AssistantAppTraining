'use strict';

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
const app = dialogflow({debug: true});

// Configure Locale
i18n.configure({
    locales: ['en-US', 'en-GB', 'es-ES', 'es-419'],
    directory: __dirname + '/locales',
    defaultLocale: 'en-US'}
);

// Config app locale middleware
app.middleware((conv) => {
    i18n.setLocale(conv.user.locale);
});

// Test intents
app.intent('test', (conv) => { // must not be async for i18n
    conv.close(i18n.__('test'));
});

// Handle the Dialogflow intent named 'Default Welcome Intent'.
app.intent('Default Welcome Intent', (conv) => {
    conv.ask(new Permission({
        context: `${i18n.__('permissions.context')}`,
        permissions: 'NAME'}
    ));
});

// Handle the Dialogflow intent named 'actions_intent_PERMISSION'. If user
// agreed to PERMISSION prompt, then boolean value 'permissionGranted' is true.
app.intent('actions_intent_PERMISSION', (conv, params, permissionGranted) => {
    if (!permissionGranted) {
        conv.ask(i18n.__(
            'askForColors.withoutPermissions')
        );
    } else {
        conv.ask(i18n.__(
            'askForColors.withPermissions',
            conv.user.name.display)
        );
    }
});

// Handle the Dialogflow intent named 'favorite color'.
// The intent collects a parameter named 'color'.
app.intent('favorite color', (conv, {color}) => {
    const luckyNumber = color.length;
    const audioSound = 'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg';

    if (conv.data.userName) {
        // If we collected user name previously, address them by name and use SSML
        // to embed an audio snippet in the response.
        conv.ask(`<speak>${conv.data.userName}, your lucky number is ` +
            `${luckyNumber}.<audio src="${audioSound}"></audio>` +
            `Would you like to hear some fake colors?</speak>`);
    } else {
        conv.ask(`<speak>Your lucky number is ${luckyNumber}.` +
            `<audio src="${audioSound}"></audio>` +
            `Would you like to hear some fake colors?</speak>`);
    }
});

// Handle the Dialogflow intent named 'favorite fake color'.
app.intent('favorite fake color', (conv, {fakeColor}) => {
    conv.close(`Here's the color`, colorMap[fakeColor]);
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