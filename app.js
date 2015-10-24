"use strict";

// APP REGION

var App = function() {
    this.image = new Image();
    this.validImgExtensions = [".jpg", ".jpeg", ".png"];
    this.canvas = document.getElementById('simple-editor');
    this.cvWidth = 800;
    this.cvHeight = 600;
    this.brightnessChangingRate = 10;
    this.mmousePressed = false;
    this.uploadUrl = '/upload.php';

    this.initEventHandlers();
    this.cropingTool = new CropingTool(this.canvas);
};

App.prototype.initEventHandlers = function() {
    $('input[type="file"]').change(function(e) {
        if (e.target.files[0]) {
            this.handleImgSelect(e.target.files[0]);
        }
    }.bind(this));

    $('#decreaseBrightness').click(function() {
        this.applyBrightnessFilter(-this.brightnessChangingRate);
    }.bind(this));

    $('#increaseBrightness').click(function() {
        this.applyBrightnessFilter(this.brightnessChangingRate);
    }.bind(this));

    $('#grayscale').click(function() {
        this.applyGrayscaleFilter();
    }.bind(this));

    $('#restore').click(function() {
        this.restoreOriginal();
    }.bind(this));

    $('#preview').click(function() {
        this.previewImage();
    }.bind(this));

    $('#upload').click(function() {
        this.handleUpload();
    }.bind(this));

    this.image.onload = function(){
        var ratio = this.calcScalingRatio(this.image.width, this.image.height, this.cvWidth, this.cvHeight);

        this.cleanUp();
        this.canvas.getContext('2d').drawImage(this.image, 0, 0, this.image.width * ratio, this.image.height * ratio);
    }.bind(this);
};

App.prototype.handleImgSelect = function(file) {
    if (!this.validateImgExtension(file.name)) {
        alert('Invalid img extension.');
        return;
    }

    var reader = new FileReader();

    reader.onload = function() {
        this.image.src = reader.result;
    }.bind(this);

    reader.readAsDataURL(file);
};

App.prototype.calcScalingRatio = function (width, height, maxWidth, maxHeight) {
    var ratio = 1;

    if (width > maxWidth) {
        ratio = maxWidth / width;
    }

    if (height*ratio > maxHeight) {
        ratio = maxHeight / height;
    }

    return ratio;
};

App.prototype.validateImgExtension = function(fileName) {
    return (new RegExp('(' + this.validImgExtensions.join('|').replace(/\./g, '\\.') + ')$')).test(fileName);
};

App.prototype.applyGrayscaleFilter = function() {
    var imageData = this.canvas.getContext('2d').getImageData(0, 0, this.cvWidth, this.cvHeight);
    var data = imageData.data;

    for (var i = 0; i < data.length; i += 4) {
        var avg = (data[i] + data[i +1] + data[i +2]) / 3;
        data[i]     = avg; // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
    }

    this.canvas.getContext('2d').putImageData(imageData, 0, 0);
};

App.prototype.applyBrightnessFilter = function(adjustment) {
    var imageData = this.canvas.getContext('2d').getImageData(0, 0, this.cvWidth, this.cvHeight);
    var data = imageData.data;

    for (var i = 0; i < data.length; i += 4) {
        data[i]     += adjustment; // red
        data[i + 1] += adjustment; // green
        data[i + 2] += adjustment; // blue
    }

    this.canvas.getContext('2d').putImageData(imageData, 0, 0);
};

App.prototype.restoreOriginal = function() {
    var ratio = this.calcScalingRatio(this.image.width, this.image.height, this.cvWidth, this.cvHeight);

    this.cleanUp();
    this.canvas.getContext('2d').drawImage(this.image, 0, 0, this.image.width * ratio, this.image.height * ratio);
};

App.prototype.cleanUp = function() {
    this.canvas.getContext('2d').clearRect(0, 0, this.cvWidth, this.cvHeight);
    this.cropingTool.dropCropArea();
};

App.prototype.prepareDataUrl = function() {
    var cropParams = this.cropingTool.getCropParams();
    if (!cropParams) {
        var ratio = this.calcScalingRatio(this.image.width, this.image.height, this.cvWidth, this.cvHeight);

        cropParams = {
            'x': 0,
            'y': 0,
            'width'  : this.image.width * ratio,
            'height'  : this.image.height * ratio
        }
    }

    var tempCanvas = document.createElement("canvas");
    tempCanvas.width = cropParams.width;
    tempCanvas.height = cropParams.height;

    var imageData = this.canvas.getContext('2d').getImageData(cropParams.x, cropParams.y, cropParams.width, cropParams.height);
    tempCanvas.getContext("2d").putImageData(imageData, 0, 0);

    return tempCanvas.toDataURL("image/png");
};

App.prototype.previewImage = function() {
    if (!this.image.src) {
        return;
    }

    var win = window.open(this.prepareDataUrl(), '_blank');
    win.focus();
};

App.prototype.handleUpload = function() {
    if (!this.image.src) {
        return;
    }

    this.blockPage();
    console.log(this.uploadUrl);
    $.post(
        this.uploadUrl,
        {
            'img': this.prepareDataUrl(),
        }
    ).done(function() {
        alert('Uploaded successfuly!');
    }.bind(this))
    .always(function() {
        this.unblockPage();
    }.bind(this));
};

App.prototype.blockPage = function() {
    $('body').append($('<div>', {'id': 'overlay'}));
};

App.prototype.unblockPage = function() {
    $('#overlay').remove();
};

// END OF APP REGION

// CROPING TOOL REGION

var CropingTool = function(canvas) {
    var $canvas = $(canvas);
    this.cropParams = {
        'startX': undefined,
        'startY': undefined,
        'endX'  : undefined,
        'endY'  : undefined
    };

    $canvas.mousedown(function (e) {
        this.mousePressed = true;
        this.dropCropArea();
        this.cropParams.startX = e.pageX - $canvas.offset().left;
        this.cropParams.startY = e.pageY - $canvas.offset().top;
    }.bind(this));

    $canvas.mouseup(function (e) {
        if (!this.mousePressed) { return; }

        this.mousePressed = false;
        this.cropParams.endX = e.pageX - $canvas.offset().left;
        this.cropParams.endY = e.pageY - $canvas.offset().top;
        this.showCropArea();
    }.bind(this));

    $canvas.mouseleave(function (e) {
        if (!this.mousePressed) { return; }

        this.mousePressed = false;
        this.cropParams.endX = e.pageX - $canvas.offset().left;
        this.cropParams.endY = e.pageY - $canvas.offset().top;
        this.showCropArea();
    }.bind(this));
};

CropingTool.prototype.showCropArea = function() {
    $('body').append($('<div>', {
        'id' : 'cropArea'
    }).css('left', Math.min(this.cropParams.startX, this.cropParams.endX))
      .css('top', Math.min(this.cropParams.startY, this.cropParams.endY))
      .width(Math.abs(this.cropParams.endX - this.cropParams.startX))
      .height(Math.abs(this.cropParams.endY - this.cropParams.startY))
    );
};

CropingTool.prototype.dropCropArea = function() {
    $('#cropArea').remove();
};

CropingTool.prototype.getCropParams = function() {
    if (!document.getElementById('cropArea')) {
        return false;
    }

    return {
        'x'      : Math.min(this.cropParams.startX, this.cropParams.endX),
        'y'      : Math.min(this.cropParams.startY, this.cropParams.endY),
        'width'  : Math.abs(this.cropParams.endX - this.cropParams.startX),
        'height' : Math.abs(this.cropParams.endY - this.cropParams.startY)
    };
};

//END OF CROPING TOOL REGION

$(function () {
    var app = new App();
});