/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* global _:true, resize:true, Cookies:true */
/* eslint no-unused-vars: "warn"*/
'use strict';

/*
 * Setups the "Try Out" and "Test" panels.
 * It connects listeners to the DOM elements in the panel to allow
 * users to select an existing image or upload a file.
 * @param params.panel {String} The panel name that will be use to locate the DOM elements.
 */
function setupUse(params) {
  var panel = params.panel || 'use';
  console.log('setupUse()', panel);

  // panel ids
  var pclass = '.' + panel + '--';
  var pid = '#' + panel + '--';

  // jquery elements we are using
  var $loading = $(pclass + 'loading');
  var $result = $(pclass + 'output');
  var $error = $(pclass + 'error');
  var $errorMsg = $(pclass + 'error-message');
  var $tbody = $(pclass + 'output-tbody');
  var $image = $(pclass + 'output-image');
  var $urlInput = $(pclass + 'url-input');
  var $imageDataInput = $(pclass + 'image-data-input');
  var $radioImages = $(pclass + 'example-radio');
  var $invalidImageUrl = $(pclass + 'invalid-image-url').hide();
  var $invalidUrl = $(pclass + 'invalid-url').show();
  var $dropzone = $(pclass + 'dropzone');
  var $fileupload = $(pid + 'fileupload');

  /*
   * Resets the panel
   */
  function reset() {
    $loading.hide();
    $result.hide();
    $error.hide();
    resetPasteUrl();
    $urlInput.val('');
    $tbody.empty();
    $dropzone.find('label').removeClass('dragover');
  }

  // init reset
  reset();

  function processImage() {
    reset();
    $loading.show();
    scrollToElement($loading);
  }

  /*
   * Shows the result from classifing an image
   */
  function showResult(results) {
    $loading.hide();
    $error.hide();

    if (!results || !results.images || !results.images[0]) {
      showError('Error processing the request, please try again later.');
      return;
    }

    // populate table
    renderTable(results);

    $result.show();
    var outputImage = document.querySelector('.use--output-image');
    if (outputImage && (outputImage.height > outputImage.width)) {
      $(outputImage).addClass('landscape');
    }
    scrollToElement($result);
  }

  function showError(message) {
    $error.show();
    $errorMsg.html(message);
    console.log($error, $errorMsg);
  }

  function _error(xhr) {
    $loading.hide();
    var message = 'Error classifing the image';
    if (xhr.responseJSON) {
      message = xhr.responseJSON.error;
    }
    showError(message);
  }

  /*
   * submit event
   */
  function classifyImage(imgPath, imageData) {
    processImage();
    if (imgPath !== '') {
      $image.attr('src', imgPath);
      $urlInput.val(imgPath);
    }

    $imageDataInput.val(imageData);

    // Grab all form data
    $.post('/api/classify', $(pclass + 'form').serialize())
      .done(showResult)
      .error(function(error) {
        $loading.hide();
        console.log(error);
        if (error.status === 429) {
          showError('You have entered too many requests at once. Please try again later.');
        } else {
          showError('The demo is not available right now. <br/>We are working on ' +
          'getting this back up and running soon.');
        }
      });
  }

  /*
   * Prevent default form submission
   */
  $fileupload.submit(false);

  /*
   * Radio image submission
   */
  $radioImages.click(function() {
    resetPasteUrl();
    var imgPath = $(this).next('label').find('img').attr('src');
    classifyImage(imgPath);
    $urlInput.val('');
  });

  /*
   * Image url submission
   */
  $urlInput.keypress(function(e) {
    var url = $(this).val();
    var self = $(this);

    if (e.keyCode === 13) {
      if (!isValidURL(url)) {
        $invalidImageUrl.hide();
        $invalidUrl.show();
        self.addClass(panel + '--url-input_error');
      } else {
        $invalidUrl.hide();
        $invalidImageUrl.hide();
        imageExists(url, function(exists) {
          if (!exists) {
            $invalidUrl.show();
            if (!/\.(jpg|png|gif)$/i.test(url)) {
              $invalidImageUrl.show();
            }
            self.addClass(panel + '--url-input_error');
          } else {
            resetPasteUrl();
            classifyImage(url);
            self.blur();
          }
        });
      }
    }

    $(self).focus();
  });

  function resetPasteUrl() {
    $urlInput.removeClass(panel + '--url-input_error');
    $invalidUrl.hide();
    $invalidImageUrl.hide();
  }
  /**
   * Jquery file upload configuration
   * See details: https://github.com/blueimp/jQuery-File-Upload
   */
  $fileupload.fileupload({
    dataType: 'json',
    dropZone: $dropzone,
    acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
    add: function(e, data) {
      data.url = '/api/classify';
      if (data.files && data.files[0]) {
        $error.hide();

        processImage();
        var reader = new FileReader();
        reader.onload = function() {
          var image = new Image();
          image.src = reader.result;
          image.onload = function() {
            $image.attr('src', this.src);
            classifyImage('', resize(image, 640));
          };
        };
        reader.readAsDataURL(data.files[0]);
      }
    },
    error: _error,
    done: function(e, data) {
      showResult(data.result);
    }
  });

  /**
   * Async function to validate if an image exists
   * @param  {String}   url      The image URL
   * @param  {Function} callback The callback
   * @return {void}
   */
  function imageExists(url, callback) {
    var img = new Image();
    img.onload = function() {
      callback(true);
    };
    img.onerror = function() {
      callback(false);
    };
    img.src = url;
  }

  /**
   * url validation with or without http://
   * @param  {String}  url The URL
   * @return {Boolean}     True if is a valid url
   */
  function isValidURL(url) {
    var urlToValidate = url;
    // add the schema if needed
    if (urlToValidate.indexOf('http://') !== 0 && urlToValidate.indexOf('https://') !== 0) {
      urlToValidate = 'http://' + urlToValidate;
    }
    // remove training /
    if (urlToValidate.substr(url.length - 1, 1) !== '/') {
      urlToValidate = urlToValidate + '/';
    }
    // validate URL with regular expression
    return /^(https|http|ftp):\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i.test(urlToValidate);
  }

  $(document).on('dragover', function() {
    $(pclass + 'dropzone label').addClass('dragover');
  });

  $(document).on('dragleave', function() {
    $(pclass + 'dropzone label').removeClass('dragover');
  });

  /*
   * scroll animation to element on page
   * @param  {$element}  Jquery element
   * @return {Void}
   */
  function scrollToElement(element) {
    $('html, body').animate({
      scrollTop: element.offset().top
    }, 300);
  }

  function roundScore(score) {
    return Math.round(score * 1000) / 1000;
  }

  function renderTable(results) {
    var useResultsTable_template = useResultsTableTemplate.innerHTML;

    // classes
    if ((results.images &&
      results.images[0].classifiers &&
      results.images[0].classifiers.length > 0 &&
      results.images[0].classifiers[0].classes !== 'undefined') &&
      results.images[0].classifiers[0].classes.length > 0) {
      var classesModel = (function() {
        var classes = results.images[0].classifiers[0].classes.map(function(item) {
          return {
            name: results.classifier_ids ? item.class : item.class,
            score: roundScore(item.score)
          };
        });

        return {
          resultCategory: 'Classes',
          tooltipText: 'Classes are trained to recognize a specific object or quality of an image.',
          data: classes
        };
      })();

      $('.classes-table').show();
      $('.classes-table').html(_.template(useResultsTable_template, {
        items: classesModel
      }));
    } else if (results.classifier_ids) {
      var bundle = JSON.parse(Cookies.get('bundle'));
      var classes = bundle.names[0];
      if (bundle.names.length > 1) {
        classes = bundle.names.slice(0, -1).join(', ') + ' or ' + bundle.names.slice(-1);
      }
      $('.classes-table').html('<div class="' + panel + '--mismatch">This image is not a match for ' + bundle.name + ': ' + classes + '.</div>');
      $('.classes-table').show();
    } else {
      $('.classes-table').hide();
    }

    // faces
    if ((typeof results.images[0].faces !== 'undefined') && (results.images[0].faces.length > 0)) {
      var facesModel = (function() {
        var faces = [];
        // age
        faces.push({
          name: 'Estimated age: ' + results.images[0].faces[0].age.min + ' - ' + results.images[0].faces[0].age.max,
          score: roundScore(results.images[0].faces[0].age.score)
        });

        // gender
        faces.push({
          name: 'Gender: ' + results.images[0].faces[0].gender.gender.toLowerCase(),
          score: roundScore(results.images[0].faces[0].gender.score)
        });

        // identity
        if (typeof results.images[0].faces[0].identity !== 'undefined') {
          faces.push({
            name: 'Identity: ' + results.images[0].faces[0].identity.name,
            score: roundScore(results.images[0].faces[0].identity.score)
          });
        }

        return {
          resultCategory: 'Faces',
          tooltipText: 'Face detection returns the estimate age and gender of each face in an image and identifies if the face is a known celebrity. ',
          data: faces
        };
      })();

      $('.faces-table').show();
      $('.faces-table').html(_.template(useResultsTable_template, {
        items: facesModel
      }));
    } else {
      $('.faces-table').hide();
    }

    // words
    if ((typeof results.images[0].words !== 'undefined') && (results.images[0].words.length > 0)) {
      var wordsModel = (function() {
        var words = results.images[0].words.map(function(item) {
          return {
            name: item.word,
            score: roundScore(item.score)
          };
        });
        return {
          resultCategory: 'Words',
          tooltipText: 'Text recognition returns English-language words found in an image.',
          data: words
        };
      })();

      $('.words-table').show();
      $('.words-table').html(_.template(useResultsTable_template, {
        items: wordsModel
      }));
    } else {
      $('.words-table').hide();
    }
  }
}
