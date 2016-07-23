requirejs.config({
    paths: {
        postmonger: 'js/postmonger'
    }
});

define(['postmonger'], function(Postmonger) {
    'use strict';
        
    var connection = new Postmonger.Session();
    
    var payload = {};
    var schemaPayload = [];

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

    connection.on('requestedSchema', onGetSchema);

    connection.on('clickedNext', onClickedNext);
    connection.on('clickedBack', onClickedBack);
    connection.on('gotoStep', onGotoStep);

    function onRender() {
        
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');
        console.log("Fire requestSchema");
        connection.trigger('requestSchema');
        connection.trigger('requestedTokens');
        connection.trigger('requestedEndpoints');

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
            $( '#initialPayload' ).text( JSON.stringify( payload , null , 4 ) );
        } else {
            $( '#initialPayload' ).text( 'initActivity contained no data' );
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
        console.log(tokens);
    }

    function onGetEndpoints (endpoints) {
        // Response: endpoints = { restHost: <url> } i.e. "rest.s1.qa1.exacttarget.com"
        console.log("Endpoints: " + JSON.stringify(endpoints));
    }

    function onGetSchema (getSchemaPayload) {
        console.log('Postmonger - requestedSchema', getSchemaPayload);
        schemaPayload = getSchemaPayload;
        // Response: getSchemaPayload == { schema: [ ... ] };
        $( '#schema' ).text( JSON.stringify( getSchemaPayload , null , 4 ) );
    }

    function onClickedNext () {
        console.log("currentStep: " + currentStep.key);
        if (
            (currentStep.key === 'secondCall') 
        ) {
            // push arguments on to the stack
            var requestMethod = getMethodType();
            var requestUrl = $('#requestUrl').val().trim();
            var requestBody = $('#requestBody').val().trim();

            var n = $("input[name^='header']").length;
            var headersArr = $("input[name^='header']");
            var valuesArr = $("input[name^='value']");
            
            console.log("Print headers: ");
            console.log(JSON.stringify(headersArr));
            console.log(JSON.stringify(valuesArr));
            //var headers = $('#headers').val();
            //var values = $('#values').val();    
            // build the headers

            payload['arguments'].execute.inArgument.push({"headers" : JSON.stringify(headersArr)});
            payload['arguments'].execute.inArgument.push({"values" : JSON.stringify(valuesArr)});    
            payload['arguments'].execute.inArguments.push({"requestUrl": requestUrl});            
            payload['arguments'].execute.inArguments.push({"requestMethod": requestMethod});
            payload['arguments'].execute.inArguments.push({"requestBody": requestBody});

            save();
        } if(currentStep.key === 'firstCall') {
            var name = $('#select1').find('option:selected').html();
            var value = getAuthType();
            payload['arguments'].execute.inArguments.push({"authType": value});

            console.log("Name " + name + " value: " + value);
                
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
            console.log("secondCall");
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

                preparePayload();
                break;
        }
    }


    function preparePayload() {
        console.log("Prepare payload called");
        //When loading the
        if (!schemaPayload.schema){
            connection.trigger('requestSchema');
        }

        // Payload is initialized on populateFields above.  Journey Builder sends an initial payload with defaults
        // set by this activity's config.json file.  Any property may be overridden as desired.

        //1.a) Configure inArguments from the interaction event
        var inArgumentsArray = [];
        var schemaInArgumentsArray = [];
        for (var i = 0; i < schemaPayload.schema.length; i++){
            var name = schemaPayload.schema[i].key.substr(schemaPayload.schema[i].key.lastIndexOf(".") + 1);
            var inArgument = {};
            inArgument[name] = "{{" + schemaPayload.schema[i].key + "}}"
            inArgumentsArray.push(inArgument);

            var schemaInArgument = {};
            schemaInArgument[name] = {};
            schemaInArgument[name].dataType = schemaPayload.schema[i].type;
            schemaInArgument[name].isNullable = schemaPayload.schema[i].isPrimaryKey ? false : (schemaPayload.schema[i].isNullable ? true : false);
            schemaInArgument[name].direction = "in";
            schemaInArgumentsArray.push(schemaInArgument);
        }

        //1.b) Configure inArguments from the UI (end user manual config)
        // var value = getMessage();
        // inArgumentsArray.push({ "message": value });
        // schemaInArgumentsArray.push({ "message": {"dataType": "Text", "isNullable":false, "direction":"in"}});

        console.log("Payload: " + JSON.stringify(payload));

        //1.c) Set all inArguments in the payload
        payload['arguments'].execute.inArguments = inArgumentsArray;
        payload['schema'].arguments.execute.inArguments = schemaInArgumentsArray;

        //2.a) Configure outArguments
        var outArgumentsArray = [];
        var schemaOutArgumentsArray = [];
        outArgumentsArray.push({ "result": "Text" });
        schemaOutArgumentsArray.push({ "result": {"dataType": "Text", "access":"visible", "direction":"out"}});

        //2.b) Set all outArguments in the payload
        payload['arguments'].execute.outArguments = outArgumentsArray;
        payload['schema'].arguments.execute.outArguments = schemaOutArgumentsArray;

        //3) Set other payload values
        payload.name = "Http Activity";
        payload['metaData'].isConfigured = true;
        
//        payload.metaData.isConfigured = true; 

        console.log('preparePayload', payload);
    }

    function save() {
        console.log("Saving...");

        connection.trigger('updateActivity', payload);

        console.log('After update activity: ' + JSON.stringify(payload));

    }

    function getAuthType() {
        return $('#select1').find('option:selected').attr('value').trim();
    }

    function getMethodType() {
        return $('#methodType').find('option:selected').attr('value').trim();
    }
});
