(function() {
  var module;

  module = angular.module('ngThreenorama', []);

  module.service('ngThreenorama', function() {
    return new NGTScene();
  });

  module.directive('ngThreenorama', function(ngThreenorama, $window, $rootScope) {
    var directive;
    return directive = {
      transclude: true,
      scope: {
        src: '=',
        zoom: '=',
        zoomStep: '=',
        start: '=',
        end: '=',
        xGeneric: '=',
        yGeneric: '=',
        sensor: '=',
        zoomAbsolute: '=',
        zoomGeneric: '=',
        pictureOverlap: '=',
        panoramaZoom: '='
      },
      link: function(scope, element, attrs, ctrl, transcludeFn) {
        var cameraValuesChanged, canvas, getMousePos, mouseDown, mouseDrag, mouseMove, mouseUp, resize, sourceChanged, updateAngles, zoomChanged;
        if (scope.zoomStep == null) {
          scope.zoomStep = 1;
        }
        if (scope.zoom == null) {
          scope.zoom = 50;
        }
        if (scope.start == null) {
          scope.start = {
            tilt: 0,
            pan: 0
          };
        }
        if (scope.end == null) {
          scope.end = {
            tilt: 0,
            pan: 0
          };
        }
        if (scope.panoramaZoom == null) {
          scope.panoramaZoom = document.getElementById("zoom").value;
        }
        if (scope.pictureOverlap == null) {
          scope.pictureOverlap = document.getElementById("pictureCoverage").value;
        }
        if (scope.xGeneric == null) {
          scope.xGeneric = {
            xMin: document.getElementById("xMin").value,
            xMax: document.getElementById("xMax").value
          };
        }
        if (scope.yGeneric == null) {
          scope.yGeneric = {
            yMin: document.getElementById("yMin").value,
            yMax: document.getElementById("yMax").value
          };
        }
        if (scope.sensor == null) {
          scope.sensor = {
            width: document.getElementById("sensorWidth").value,
            height: document.getElementById("sensorHeight").value
          };
        }
        if (scope.zoomAbsolute == null) {
          scope.zoomAbsolute = {
            min: document.getElementById("minFocal").value,
            max: document.getElementById("maxFocal").value
          };
        }
        if (scope.zoomGeneric == null) {
          scope.zoomGeneric = {
            min: document.getElementById("minZoom").value,
            max: document.getElementById("maxZoom").value
          };
        }
        cameraValuesChanged = function() {
          return updateAngles();
        };
        scope.moveCenter = function() {
          return ngThreenorama.ngtCamera.moveCenter();
        };
        scope.moveUp = function() {
          return ngThreenorama.ngtCamera.moveUp();
        };
        scope.moveDown = function() {
          return ngThreenorama.ngtCamera.moveDown();
        };
        scope.moveLeft = function() {
          return ngThreenorama.ngtCamera.moveLeft();
        };
        scope.moveRight = function() {
          return ngThreenorama.ngtCamera.moveRight();
        };
        scope.zoomIn = function() {
          return scope.zoom -= scope.zoomStep;
        };
        scope.zoomOut = function() {
          return scope.zoom += scope.zoomStep;
        };
        scope.sliderChange = function() {
          return scope.zoom = scope.sliderValue;
        };
        scope.singlePicture = function() {
          var focalDistance, maxFocal, minFocal, panAngle, tiltAngle;
          minFocal = document.getElementById("minFocal").value;
          maxFocal = document.getElementById("maxFocal").value;
          focalDistance = 1 * minFocal + ((maxFocal - minFocal) * (document.getElementById("zoom").value / 100));
          panAngle = Math.atan(document.getElementById("sensorWidth").value / (2 * focalDistance));
          tiltAngle = Math.atan(document.getElementById("sensorHeight").value / (2 * focalDistance));
          ngThreenorama.setViewFinderToSinglePicture(panAngle, tiltAngle);
          return updateAngles();
        };
        sourceChanged = function() {
          return ngThreenorama.changeImage(scope.src);
        };
        resize = function() {
          return ngThreenorama.resizeWindow(element[0].clientWidth, element[0].clientHeight);
        };
        zoomChanged = function() {
          ngThreenorama.ngtCamera.setZoom(scope.zoom);
          return scope.sliderValue = scope.zoom;
        };
        getMousePos = function(event) {
          var x, y;
          x = event.pageX - element[0].offsetLeft - element[0].offsetParent.offsetLeft;
          y = event.pageY - element[0].offsetTop - element[0].offsetParent.offsetTop;
          return [x, y];
        };
        mouseDown = function(event) {
          var xy;
          xy = getMousePos(event);
          return ngThreenorama.mouseDown(new THREE.Vector2(xy[0], xy[1]));
        };
        mouseUp = function(event) {
          var xy;
          xy = getMousePos(event);
          return ngThreenorama.mouseUp(new THREE.Vector2(xy[0], xy[1]));
        };
        mouseMove = function(event) {
          var xy;
          xy = getMousePos(event);
          return ngThreenorama.mouseMove(new THREE.Vector2(xy[0], xy[1]));
        };
        mouseDrag = function(event) {
          var xy;
          xy = getMousePos(event);
          return ngThreenorama.mouseDrag(new THREE.Vector2(xy[0], xy[1]));
        };
        updateAngles = function(event) {
          var cols, correction360, endX, endY, focalDistance, hours, i, maxFocal, minFocal, minZoomHeight, minZoomWidth, minutes, panAngle, picsPerMin, pictureCoverage, rows, seconds, startX, startY, tiltAngle, xDelta, yDelta;
          minFocal = 0.0;
          maxFocal = 0.0;
          minFocal = document.getElementById("minFocal").value;
          maxFocal = document.getElementById("maxFocal").value;
          focalDistance = 1 * minFocal + ((maxFocal - minFocal) * (document.getElementById("zoom").value / 100));
          panAngle = Math.atan(document.getElementById("sensorWidth").value / (2 * focalDistance)) * (180 / Math.PI);
          tiltAngle = Math.atan(document.getElementById("sensorHeight").value / (2 * focalDistance)) * (180 / Math.PI);
          minZoomWidth = Math.atan(document.getElementById("sensorWidth").value / (2 * minFocal)) * (180 / Math.PI);
          minZoomHeight = Math.atan(document.getElementById("sensorHeight").value / (2 * minFocal)) * (180 / Math.PI);
          pictureCoverage = 1 - document.getElementById("pictureCoverage").value / 100;
          xDelta = panAngle * pictureCoverage / 360 * scope.xGeneric.xMin + panAngle * pictureCoverage / 360 * scope.xGeneric.xMax;
          yDelta = tiltAngle * pictureCoverage / 180 * scope.yGeneric.yMin + tiltAngle * pictureCoverage / 180 * scope.yGeneric.yMax;
          startX = ngThreenorama.ngtAnchors.startPan - minZoomWidth / 2;
          if (startX < 0) {
            startX = 360 + startX;
          }
          startY = ngThreenorama.ngtAnchors.startTilt - minZoomHeight / 2;
          endX = ngThreenorama.ngtAnchors.endPan - minZoomWidth / 2;
          if (endX < 0) {
            endX = 360 + endX;
          }
          endY = ngThreenorama.ngtAnchors.endTilt - minZoomHeight / 2;
          scope.start.pan = (startX + panAngle / 2) % 360;
          scope.start.tilt = startY + tiltAngle / 2;
          scope.end.pan = (endX - panAngle / 2) % 360;
          scope.end.tilt = endY - tiltAngle / 2;
          if ((ngThreenorama.ngtAnchors.startPan + panAngle >= ngThreenorama.ngtAnchors.endPan && ngThreenorama.ngtAnchors.startPan < ngThreenorama.ngtAnchors.endPan) || (ngThreenorama.ngtAnchors.endPan + panAngle >= ngThreenorama.ngtAnchors.startPan && ngThreenorama.ngtAnchors.endPan < ngThreenorama.ngtAnchors.startPan)) {
            scope.end.pan = scope.start.pan;
          }
          if ((ngThreenorama.ngtAnchors.startTilt + tiltAngle >= ngThreenorama.ngtAnchors.endTilt && ngThreenorama.ngtAnchors.startTilt < ngThreenorama.ngtAnchors.endTilt) || (ngThreenorama.ngtAnchors.endTilt + tiltAngle >= ngThreenorama.ngtAnchors.startTilt && ngThreenorama.ngtAnchors.endTilt < ngThreenorama.ngtAnchors.startTilt)) {
            scope.end.tilt = scope.start.tilt;
          }
          scope.start.pan = scope.start.pan / 360 * scope.xGeneric.xMin + scope.start.pan / 360 * scope.xGeneric.xMax;
          scope.start.tilt = scope.start.tilt / 180 * scope.yGeneric.yMin + scope.start.tilt / 180 * scope.yGeneric.yMax;
          if (scope.start.tilt > 0) {
            scope.start.tilt = 0;
            ngThreenorama.ngtAnchors.tiltOutOfLimit = true;
          } else {
            ngThreenorama.ngtAnchors.tiltOutOfLimit = false;
          }
          scope.end.pan = scope.end.pan / 360 * scope.xGeneric.xMin + scope.end.pan / 360 * scope.xGeneric.xMax;
          scope.end.tilt = scope.end.tilt / 180 * scope.yGeneric.yMin + scope.end.tilt / 180 * scope.yGeneric.yMax;
          if (scope.end.tilt > 0) {
            scope.end.tilt = 0;
          }
          i = scope.start.pan;
          correction360 = 0;
          if (i > scope.end.pan) {
            correction360 = 1;
          }
          cols = 1;
          while (i + xDelta < scope.end.pan + correction360) {
            cols++;
            i += xDelta;
          }
          i = scope.start.tilt;
          if (scope.start.tilt > 0) {
            i *= -1;
          }
          rows = 1;
          while (i + yDelta > scope.end.tilt) {
            rows++;
            i += yDelta;
          }
          document.getElementById("xStart").textContent = scope.start.pan;
          document.getElementById("yStart").textContent = scope.start.tilt;
          document.getElementById("xEnd").textContent = scope.end.pan;
          document.getElementById("yEnd").textContent = scope.end.tilt;
          document.getElementById("xDelta").textContent = xDelta;
          document.getElementById("yDelta").textContent = yDelta;
          document.getElementById("zoomGeneric").textContent = document.getElementById("zoom").value / 100 * document.getElementById("minZoom").value + document.getElementById("zoom").value / 100 * document.getElementById("maxZoom").value;
          document.getElementById("numOfPicutres").textContent = rows + " x " + cols + " = " + (rows * cols);
          picsPerMin = document.getElementById("picsPerMin").value;
          minutes = rows * cols / picsPerMin;
          hours = Math.floor(minutes / 60);
          minutes -= hours * 60;
          seconds = (minutes - Math.floor(minutes)) * 60;
          document.getElementById("time").textContent = hours + " Hours " + (Math.floor(minutes)) + " Minutes " + (Math.floor(seconds)) + " Seconds";
          if (ngThreenorama.ngtAnchors.tiltOutOfLimit) {
            document.getElementById("numOfPicutres").textContent += ", Warning: Start Tilt is out of Range!";
          }
          return ngThreenorama.outOfRangeColorChange();
        };
        canvas = angular.element('<canvas>')[0];
        ngThreenorama.init();
        element.append(ngThreenorama.renderer.domElement);
        resize();
        element[0].onmousedown = mouseDown;
        element[0].onmouseup = mouseUp;
        element[0].onmousemove = mouseMove;
        element[0].onmousedrag = mouseDrag;
        ngThreenorama.onChangeRect = function() {
          return updateAngles();
        };
        scope.$watch('zoom', zoomChanged);
        scope.$watch('src', sourceChanged);
        scope.$watch('xGeneric', cameraValuesChanged, true);
        scope.$watch('yGeneric', cameraValuesChanged, true);
        scope.$watch('sensor', cameraValuesChanged);
        scope.$watch('zoomAbsolute', cameraValuesChanged);
        scope.$watch('zoomGeneric', cameraValuesChanged);
        scope.$watch('pictureOverlap', cameraValuesChanged);
        scope.$watch('panoramaZoom', cameraValuesChanged);
        $window.onresize = resize;
        return transcludeFn(scope, function(clonedTranscludeTemplate) {
          return element.append(clonedTranscludeTemplate);
        });
      }
    };
  });

}).call(this);
