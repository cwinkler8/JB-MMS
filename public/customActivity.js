requirejs.config({
    paths: {
        postmonger: 'js/postmonger'
    }
});

define(['postmonger'], function(Postmonger) {
    'use strict';
        
    var connection = new Postmonger.Session();
    
    var payload = {};
    var lastStepEnabled = false;
    var steps = [ // initialize to the same value as what's set in config.json for consistency
        { "label": "Step 1", "key": "firstCall" },
        { "label": "Step 2", "key": "secondCall" }
    ];
    var currentStep = steps[0].key;

    $(window).ready(onRender);
    console.log('payload pre-init: ' + JSON.stringify(payload));
     
    connection.on('initActivity', initialize);
    connection.on('requestedTokens', onGetTokens);
    connection.on('requestedEndpoints', onGetEndpoints);

    connection.on('clickedNext', onClickedNext);
    connection.on('clickedBack', onClickedBack);
    connection.on('gotoStep', onGotoStep);

    console.log("Request schema called");
    connection.on('requestSchema', onGetSchema);
    connection.trigger('requestSchema');

    function onGetSchema(schema) {
        console.log(JSON.stringify(schema));
    }

    function requestedSchema (data) {
        console.log("Requested schema: " + JSON.stringify(data));
    }

    function onRender() {
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');

        connection.trigger('requestTokens');
        connection.trigger('requestEndpoints');

        // Disable the next button if a value isn't selected
        $('#select1').change(function() {
            var message = getAuthType();
            connection.trigger('updateButton', { button: 'next', enabled: Boolean(message) });

           $('#authType').html(authType);
        });
    }

    function initialize (data) {
        console.log("Calling initialize");

        if (data) {
            payload = data;
        }
        console.log("Payload in initialize: " + JSON.stringify(payload))
        var authType;
        var hasInArguments = Boolean(
            payload['arguments'] &&
            payload['arguments'].execute &&
            payload['arguments'].execute.inArguments &&
            payload['arguments'].execute.inArguments.length > 0
        );

        var inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};

        $.each(inArguments, function(index, inArgument) {
            $.each(inArgument, function(key, val) {
                if (key === 'authType') {
                    authType = val;
                    console.log("authType " + authType);
                }
            });
        });

        // If there is no authentication method selected, disable the next button
        if (!authType) {
            showStep(null, 1);
            connection.trigger('updateButton', { button: 'next', enabled: false });
    //        // If there is a message, skip to the summary step
        } else {
          $('#select1').find('option[value='+ authType +']').attr('selected', 'selected');
           $('#authType').html(authType);
            showStep(null, 2);
        }
    }


    function onGetTokens (tokens) {
        // Response: tokens = { token: <legacy token>, fuel2token: <fuel api token> }
        // console.log(tokens);
    }

    function onGetEndpoints (endpoints) {
        // Response: endpoints = { restHost: <url> } i.e. "rest.s1.qa1.exacttarget.com"
        // console.log(endpoints);
    }

    function onClickedNext () {
        console.log("currentStep: " + currentStep.key);
        if (
            (currentStep.key === 'secondCall') 
        ) {
            save();
        } else {
            connection.trigger('nextStep');
        }
    }

    function onClickedBack () {
        connection.trigger('prevStep');
    }

    function onGotoStep (step) {
        showStep(step);
        connection.trigger('ready');
    }

    function showStep(step, stepIndex) {
        if (stepIndex && !step) {
            step = steps[stepIndex-1];
        }

        currentStep = step;

        $('.step').hide();
        console.log("Current step: " + currentStep.key);

        switch(currentStep.key) {
            case 'firstCall':
                $('#firstCall').show();
                connection.trigger('updateButton', {
                    button: 'next',
                    enabled: Boolean(getAuthType())
                });
                connection.trigger('updateButton', {
                    button: 'back',
                    visible: false
                });
                break;
            case 'secondCall':
                $('#secondCall').show();
                connection.trigger('updateButton', {
                    button: 'back',
                    visible: true
                });
                connection.trigger('updateButton', {
                    button: 'next',
                    text: 'done',
                    visible: true
                });
                break;
        }
    }

    function save() {
        console.log("Saving...");
        var name = $('#select1').find('option:selected').html();
        var value = getAuthType();
        console.log("Name " + name + " value: " + value);

        // 'payload' is initialized on 'initActivity' above.
        // Journey Builder sends an initial payload with defaults
        // set by this activity's config.json file.  Any property
        // may be overridden as desired.
        
        payload.name = name;
        payload['arguments'].execute.inArguments.push({"message": value});
        
        payload.metaData.isConfigured = true; 
        console.log('Payload: ' + JSON.stringify(payload));

        connection.trigger('updateActivity', payload);

        console.log('After update activity: ' + JSON.stringify(payload));

    }

    function getAuthType() {
        return $('#select1').find('option:selected').attr('value').trim();
    }

});
