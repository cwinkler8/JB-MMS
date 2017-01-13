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
    connection.on('requestedSchema', onGetSchema);
    connection.on('clickedNext', onClickedNext);
    connection.on('clickedBack', onClickedBack);
    connection.on('gotoStep', onGotoStep);

    function onRender() {
        
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');
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
        console.log(data);

        connection.trigger('requestSchema');

        if (data) {
            var authType;

            payload = data;
            console.log( JSON.stringify( payload , null , 4 ) );

            // populate fields
            console.log(payload['arguments']);
            console.log(payload['arguments'].execute);
            for (var prop in payload['arguments'].execute.inArguments) {
                // `prop` contains the name of each property, i.e. `'code'` or `'items'`
                // consequently, `data[prop]` refers to the value of each property, i.e.
                // either `42` or the array
                console.log(prop);
                for (var member in payload['arguments'].execute.inArguments[prop]) {
                    console.log("key: " + member);

                    if(member == "authType") {
                        authType = payload['arguments'].execute.inArguments[prop][member];
                        setAuthType(authType);
                    }
                    if(member == "requestMethod") {
                        setMethodType(payload['arguments'].execute.inArguments[prop][member])     
                    }
                    if(member == "requestUrl") {
                        setRequestUrl(payload['arguments'].execute.inArguments[prop][member]);
                    }
                    if(member == "requestBody") {
                        setRequestBody(payload['arguments'].execute.inArguments[prop][member]);
                    }
                    if(member == "headers") {
                        // loop through the headers and set them in the input
                        setHeaders(payload['arguments'].execute.inArguments[prop][member])
                    }
                }
            }

        } else {
            console.log.text( 'initActivity contained no data' );
        }

        console.log("Payload in initialize: " + JSON.stringify(payload));

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
            // todo: might not need this
            var requestUrl = getRequestUrl();
            var requestBody = getRequestBody();

            // the following code correctly handles the header keys and values
            var fHeaders = document.forms.requestForm.querySelectorAll('input[name^="header"]')
            var fValues = document.forms.requestForm.querySelectorAll('input[name^=value]');
            var header = {};

            for(var i = 0; i < fHeaders.length; i++)
            {                
                /* do whatever you need to do with each input */
                console.log("Name: " + fHeaders[i].value + " Value: " + fValues[i].value);
                if(fHeaders[i].value.length > 0) {
                  header[fHeaders[i].value] = fValues[i].value;                                
                }
            }    
            // TODO: don't push onto the stack ... remove the other stuff off of it, otherwise
            // you just end up with a bunch of cruft on the stack
  		    payload['arguments'].execute.inArguments = []; // remove all the args, only save the last one

            payload['arguments'].execute.inArguments.push({"authType" : getAuthType()});
            payload['arguments'].execute.inArguments.push({"headers" : header});            
            payload['arguments'].execute.inArguments.push({"requestUrl": requestUrl});            
            payload['arguments'].execute.inArguments.push({"requestMethod": requestMethod});
            payload['arguments'].execute.inArguments.push({"requestBody": requestBody});

            save();
        } if(currentStep.key === 'firstCall') {
            // var name = $('#select1').find('option:selected').html();
            // var value = getAuthType();
            // console.log("Push authType onto the stack " + value);
            // payload['arguments'].execute.inArguments.push({"authType" : value});

            connection.trigger('nextStep');
        }
    }

    function preparePayload() {
        console.log("Prepare payload called");
        //When loading the
        if (!schemaPayload.schema){
            connection.trigger('requestSchema');
        }
        
        // clear out the previous arguments
        // might need to move this ... TODO 
        //payload['arguments'].execute.inArguments = []; // remove all the args, only save the last commit

        // Payload is initialized on populateFields above.  Journey Builder sends an initial payload with defaults
        // set by this activity's config.json file.  Any property may be overridden as desired.

//         //1.b) Configure inArguments from the UI (end user manual config)
//         var authType = getAuthType();
//         var requestUrl = getRequestUrl();
//         var requestMethod = getMethodType();

//         console.log("Payload: " + JSON.stringify(payload));


//         //3) Set other payload values
//         payload.name = "Http Activity";
//         payload['metaData'].isConfigured = true;
        
// //        payload.metaData.isConfigured = true; 

//         console.log('preparePayload', payload);
    }

    function save() {
        console.log("Saving...");

        console.log("Payload: " + JSON.stringify(payload));

        //3) Set other payload values
        payload.name = "Http Activity";
        
        payload.metaData.isConfigured = true;

//        payload.metaData.isConfigured = true; 

        console.log('preparePayload', payload);

        console.log('After update activity: ' + JSON.stringify(payload));
        connection.trigger('updateActivity', payload);

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

    function setHeaders(headers) {
        console.log("work on setting the headers")
        console.log(headers);
    }

    function setAuthType(authType) {
         $("#select1").val(authType);
    }

    function setRequestUrl(requestUrl) {
        $('#requestUrl').val(requestUrl);
    }

    function setRequestBody(requestBody) {
        $('#requestBody').val(requestBody);
    }    

    function setMethodType(methodType) {         
         $("#methodType").val(methodType);     
    }

    function getAuthType() {
        return $('#select1').find('option:selected').attr('value').trim();
    }

    function getRequestUrl() {
        return $('#requestUrl').val().trim()
    }

    function getRequestBody() {
        return $('#requestBody').val().trim()
    }

    function getMethodType() {
        return $('#methodType').find('option:selected').attr('value').trim();
    }
});
