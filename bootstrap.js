function BarcodeScanner() {
    'use strict';
	
    var
    // barcode main objects
    zxing,
    sampler,
    element,

    // application  references
    isZxingInit = false,
    isDomReady = false,
    isVisible = false,
    isCancelled = false,
    raiseSuccess,
    raiseError;


    // decoding barcode
    function readCode(decoder, pixels, format) {
        'use strict';

        console.log('- Decoding with ZXing...');

        var result = zxing.decode(pixels, decoder.pixelWidth, decoder.pixelHeight, format);

        if (result) {
            console.log('- DECODED: ', result);
            close(result);
        } else if (isCancelled) {
            console.log('- CANCELLED!');
            close({ cancelled: true });
        } else {
            render();
        }
    }

    // decode pixel data
    function decodeBitmapStream(decoder, rawPixels) {
        console.log('- Decoding bitmap stream...');

        var pixels, format, pixelBuffer_U8;

        switch (decoder.bitmapPixelFormat) {

            // RGBA 16
            case Windows.Graphics.Imaging.BitmapPixelFormat.rgba16:
                console.log('- RGBA16 detected...');

                // allocate a typed array with the raw pixel data
                pixelBuffer_U8 = new Uint8Array(rawPixels);

                // Uint16Array provides a typed view into the raw bit pixel data
                pixels = new Uint16Array(pixelBuffer_U8.buffer);

                // defining image format
                format = (decoder.bitmapAlphaMode === Windows.Graphics.Imaging.BitmapAlphaMode.straight ? ZXing.BitmapFormat.rgba32 : ZXing.BitmapFormat.rgb32);
                break;

                // RGBA 8
            case Windows.Graphics.Imaging.BitmapPixelFormat.rgba8:
                console.log('- RGBA8 detected...');

                // for 8 bit pixel, formats, just use returned pixel array.
                pixels = rawPixels;

                // defining image format
                format = (decoder.bitmapAlphaMode === Windows.Graphics.Imaging.BitmapAlphaMode.straight ? ZXing.BitmapFormat.rgba32 : ZXing.BitmapFormat.rgb32);
                break;

                // BGRA 8
            case Windows.Graphics.Imaging.BitmapPixelFormat.bgra8:
                console.log('- BGRA8 detected...');

                // basically, this is still 8 bits...
                pixels = rawPixels;

                // defining image format
                format = (decoder.bitmapAlphaMode === Windows.Graphics.Imaging.BitmapAlphaMode.straight ? ZXing.BitmapFormat.bgra32 : ZXing.BitmapFormat.bgr32);
        }

        // checking barcode
        readCode(decoder, pixels, format);
    }

    // loads data stream
    function loadStream(buffer) {
        console.log('- Loading stream...');

        Windows.Graphics.Imaging.BitmapDecoder.createAsync(buffer).done(function (decoder) {
            console.log('- Stream has been loaded!');

            if (decoder) {
                console.log('- Decoding data...');

                decoder.getPixelDataAsync().then(

                    function onSuccess(pixelDataProvider) {
                        console.log('- Detaching pixel data...');
                        decodeBitmapStream(decoder, pixelDataProvider.detachPixelData());
                    }, raiseError);
            } else {
                raiseError(new Error('Unable to load camera image'));
            }

        }, raiseError);
    }


    // renders image
    function render() {
        console.log('- Sampling...');

        ////////////////////////////////////////////////////////
        // guocongy: make the camera continous focus
        sampler.videoDeviceController.focusControl.focusAsync();
        ////////////////////////////////////////////////////////

        var frame, canvas = document.createElement('canvas');

        canvas.width = element.videoWidth;
        canvas.height = element.videoHeight;
        canvas.getContext('2d').drawImage(element, 0, 0, canvas.width, canvas.height);

        frame = canvas.msToBlob().msDetachStream();
        loadStream(frame);
    }

    // initialize ZXing
    function initZXing() {
        console.log('- Creating ZXing instance...');

        if (!isZxingInit) {
            console.log('- ZXing instance has been created!');

            isZxingInit = true;
            zxing = new ZXing.BarcodeReader();
        } else {
            console.log('- ZXing instance has been recovered!');
        }
    }

    // initialize MediaCapture
    function initSampler() {
        console.log('- Initializing MediaCapture...');
        sampler = new Windows.Media.Capture.MediaCapture();
        return sampler.initializeAsync();
    }

    // initializes dom element
    function createCameraElement() {
        console.log('- Creating DOM element...');

        if (!isDomReady) {
            isDomReady = true;
            element = document.createElement('video');

            element.style.display = 'none';
            element.style.position = 'absolute';
            element.style.left = '0px';
            element.style.top = '0px';
            element.style.zIndex = 2e9;
            element.style.width = '100%';
            element.style.height = '100%';

            element.onclick = cancel;

            document.body.appendChild(element);
            console.log('- Camera element has been created!');

        } else {
            console.log('- DOM is ready!');
        }
    }


    // cancel rendering
    function cancel() {
        isCancelled = true;
    }

    // close panel
    function close(result) {
        element.style.display = 'none';
        element.pause();
        element.src = '';
        isVisible = false;
        element.parentNode.removeChild(element);
        isDomReady = false;
        raiseSuccess(result);
    }

    // show camera panel
    function showPanel() {
        if (!isVisible) {
            isCancelled = false;
            isVisible = true;
            element.style.display = 'block';
            ////////////////////////////////////////////////////////
            // guocongy: this make it works in portrait mode to scale. Also fine to set when using landscape mode.
            element.msZoom = true;
            ////////////////////////////////////////////////////////
            element.src = URL.createObjectURL(sampler);
            element.play();
        }
    }

    this.start = function (win, fail) {
        console.log('- Starting camera device...');

        // saving references
        raiseSuccess = win;
        raiseError = fail;

        // init objects
        initZXing();

        initSampler().done(function () {
            console.log('- MediaCapture has been initialized successfully!');

            ////////////////////////////////////////////////////////
            // guocongy: this make it works in portrait mode, we need to make it work in landscape mode
            sampler.setPreviewRotation(Windows.Media.Capture.VideoRotation.clockwise90Degrees);
            ////////////////////////////////////////////////////////

            // preparing to show camera preview
            createCameraElement();
            showPanel();

            setTimeout(render, 100);
        }, raiseError);

    };

}



function doScan() {
    'use strict';

    // clear the previous barcode scan result
    document.getElementById('barcoderesult').innerText = "";

    var scanner = new BarcodeScanner();
    scanner.start(
		function (result) {
		    console.log(result);
		    document.getElementById('barcoderesult').innerText = "success, the barcode is: " + result.toString();
		},

		function (e) {
		    document.getElementById('barcoderesult').innerText = "failed: " + e.toString();
		});
}