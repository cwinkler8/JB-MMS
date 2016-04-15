requirejs.config({
    paths: {
        postmonger: 'js/postmonger'
    }
});

define(['postmonger'], function(Postmonger) {
    'use strict';
        
    console.log("Postmonger: " + Postmonger);
    var connection = new Postmonger.Session();
    
    var payload = {};
    var lastStepEnabled = false;
    var steps = [ // initialize to the same value as what's set in config.json for consistency
        { "label": "Step 1", "key": "firstCall" },
        { "label": "Step 2", "key": "secondCall" }
    ];
    var currentStep = steps[0].key;

    $(window).ready(onRender);
    console.log('payload',payload);
     
    connection.on('initActivity', initialize);
    connection.on('requestedTokens', onGetTokens);
    connection.on('requestedEndpoints', onGetEndpoints);

    connection.on('clickedNext', onClickedNext);
    connection.on('clickedBack', onClickedBack);
    connection.on('gotoStep', onGotoStep);

    function onRender() {
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');

        connection.trigger('requestTokens');
        connection.trigger('requestEndpoints');

        // Disable the next button if a value isn't selected
     //   $('#select1').change(function() {
       //     var message = getMessage();
     //       connection.trigger('updateButton', { button: 'next', enabled: Boolean(message) });

       //     $('#message').html(message);
     //   });

        // Toggle step 4 active/inactive
        // If inactive, wizard hides it and skips over it during navigation
   //     $('#toggleLastStep').click(function() {
   //         lastStepEnabled = !lastStepEnabled; // toggle status
   //         steps[3].active = !steps[3].active; // toggle active

     //       connection.trigger('updateSteps', steps);
    //    });
    }

    function initialize (data) {
        if (data) {
            payload = data;
        }

        var message;
        var hasInArguments = Boolean(
            payload['arguments'] &&
            payload['arguments'].execute &&
            payload['arguments'].execute.inArguments &&
            payload['arguments'].execute.inArguments.length > 0
        );

        var inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};

        $.each(inArguments, function(index, inArgument) {
            $.each(inArgument, function(key, val) {
                if (key === 'message') {
                    message = val;
                }
            });
        });

        // If there is no message selected, disable the next button
     //   if (!message) {
     //       showStep(null, 1);
    //        connection.trigger('updateButton', { button: 'next', enabled: false });
    //        // If there is a message, skip to the summary step
    //    } else {
    //        $('#select1').find('option[value='+ message +']').attr('selected', 'selected');
    //        $('#message').html(message);
    //        showStep(null, 3);
    //    }
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
        console.log("onClickedNext called");
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
                    enabled: Boolean(getMessage())
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
        console.log("Saving..");
        var name = $('#select1').find('option:selected').html();
        var value = getMessage();

        // 'payload' is initialized on 'initActivity' above.
        // Journey Builder sends an initial payload with defaults
        // set by this activity's config.json file.  Any property
        // may be overridden as desired.
        
        payload.name = name;
        payload['arguments'].execute.inArguments.push({"message": value});
        
        payload.metaData.isConfigured = true; 

        connection.trigger('updateActivity', payload);
    }

    function getMessage() {
        return $('#select1').find('option:selected').attr('value').trim();
    }

});
