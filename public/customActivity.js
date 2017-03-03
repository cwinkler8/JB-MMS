requirejs.config({
    paths: {
        postmonger: 'js/postmonger'
    }
});

var t;
var lastRowNum = 0;

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
    // console.log('payload pre-init: ' + JSON.stringify(payload));
     
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
        // console.log(data);

        connection.trigger('requestSchema');

        if (data) {
            var authType;

            payload = data;
            console.log( JSON.stringify( payload , null , 4 ) );

            // populate fields
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
                        // if there are headers to set do it here
                        var keys = Object.keys(payload['arguments'].execute.inArguments[prop][member]);
                        if(keys.length > 0) { 
                        //     console.log("set headers");
                             setHeaders(payload['arguments'].execute.inArguments[prop][member])
                        } else {
                            // console.log("add a default row")
                            addEmptyRow(t);    
                        }
                    }
                }
            }
            
        } else {
            console.log.text( 'initActivity contained no data' );
        }

//        console.log("Payload in initialize: " + JSON.stringify(payload));

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
        // console.log('Postmonger - requestedSchema', getSchemaPayload);
        schemaPayload = getSchemaPayload;
        // Response: getSchemaPayload == { schema: [ ... ] };
        $( '#schema' ).text( JSON.stringify( getSchemaPayload , null , 4 ) );
    }

    function onClickedNext () {
        // console.log("currentStep: " + currentStep.key);
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
                // console.log("Name: " + fHeaders[i].value + " Value: " + fValues[i].value);
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

            // before saving add the activity onto the split
            connection.trigger('requestInteraction');    

            save();
        } if(currentStep.key === 'firstCall') {
            connection.trigger('nextStep');
        }
    }

    function preparePayload() {
        console.log("Prepare payload called");
        //When loading the
        if (!schemaPayload.schema){
            connection.trigger('requestSchema');
        }
    }

    connection.on('requestedInteraction', function (ixn) {
    // Note: This would use underscore to get the first random split activity returned, but that doesn't mean it's the first in the tree of activities
    var firstRandomSplit = _.findWhere(ixn.activities, {type: 'RANDOMSPLIT'})
    payload['arguments'].inArguments.push([{
        choice: '{{Interaction.' + firstRandomSplit.key + '.actualChoice}}'
        }])
    })

    function save() {
        console.log("Saving...");

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
        // console.log("Current step: " + currentStep.key);

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
            // console.log("secondCall");
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

    function addEmptyRow(dt) {
        addRow(dt, "", "");
    }

    function addRow(dt, headerKey, headerValue)  {

        var rowIndex = dt.rows().count();    
        console.log("Row count: " + rowIndex);

        if(rowIndex < lastRowNum) {
            rowIndex = lastRowNum;
        }
        
        var imageName = "img" + rowIndex;

        dt.row.add([
                '<input id="header[' + rowIndex + ']" type="text" size="35" value="' + headerKey +'" name="header[' + rowIndex + ']" placeholder="Header">',
                '<input type="text" size="70" value="' + headerValue + '" name="value[' + rowIndex + ']" placeholder="Value">',
                '<img id="' + imageName + '" src="images/delete.png" height="20px" width="20px">']
        ).draw();

        lastRowNum++;

        $("#" + imageName).click(function(event) {
            t.row( $(this).parents('tr') ).remove().draw();         
        });
    }

    $(document).ready(function() {
        
        t = $('#headerTable').DataTable( {
            "dom" : "tB",
            "bAutoWidth": false,
            "paging":   false,
            "ordering": false,
            "info":     false,
            "searching": false,
            "buttons": [
                {
                    text: 'Add Header',
                    action: function ( e, dt, node, config ) {
                        addEmptyRow(dt);
                    }                
                }
            ]
        } );
        
    } );

    function setHeaders(headers) {

        for (var header in headers) {
            addRow(t, header, headers[header]);            
        }
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

    $('#testButton').click(function () {

        $.ajax({
            method: 'POST',
            dataType: 'json',
            url: 'https://polar-taiga-52256.herokuapp.com/testRequestConfig',
            data: JSON.stringify($('#requestForm').serializeJSON())
        })
            .done(function (data) {
                // console.log(JSON.stringify($('#requestForm').serializeJSON()));
                var message = "Configuration JSON: </br>";
                message += JSON.stringify(data);
                jQuery.colorbox({ html: message })
            })
            .fail(function (data) { alert(data); })
            .always(function (data) { console.log("test request completed") });

    });

});
