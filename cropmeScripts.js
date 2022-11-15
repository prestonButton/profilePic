 
//Cropme in Modal
var CiM = { 
  myCropme: null,
  opt: {
    //our extra properties. must be set!
    my_win_ratio: 0, 
    my_final_size: {w:0, h:0},
    container: { width: 0, height: 0 }, //to be set
    viewport: {
      width: 0, height: 0, //to be set
      type: 'square',
      border: { width: 2, enable: true, color: '#fff' }
    },
    zoom: { enable: true, mouseWheel: true, slider: true },
    rotation: { slider: true, enable: true },
    transformOrigin: 'viewport',
  },

  crop_into_img: function(img, callback) {
    CiM.myCropme.crop({
      width: CiM.opt.my_final_size.w,
    }).then(function(res) {
      img[0].src = res;
      CiM.myCropme.destroy();
      CiM.myCropme = null;
      if (callback) callback();
    })
  },

  imgHolder: null,
  imgHolderCallback: null,
  read_file_from_input: function(input, callback) {
    if (input.files && input.files[0]) {
        imgHolderCallback = callback;
        var reader = new FileReader();
        if (!CiM.imgHolder) {
          CiM.imgHolder = new Image();
          CiM.imgHolder.onload = function () {
             if (imgHolderCallback) { 
               imgHolderCallback();
             }
          }
        }
        reader.onload = function (e) {
          console.log('image data loaded!');
          CiM.imgHolder.src = e.target.result; //listen to img:load...
        }
        reader.readAsDataURL(input.files[0]);
    }
    else {
      console.warn('failed to read file');
    }
  },
  
  getImagePlaceholder: function(width, height, text) {
    //based on https://cloudfour.com/thinks/simple-svg-placeholder/
    var svg = '\
      <svg xmlns="http://www.w3.org/2000/svg" width="{w}" \
      height="{h}" viewBox="0 0 {w} {h}">\
      <rect fill="#ddd" width="{w}" height="{h}"/>\
      <text fill="rgba(0,0,0,0.5)" font-family="sans-serif"\
      font-size="30" dy="10.5" font-weight="bold"\
      x="50%" y="50%" text-anchor="middle">{t}</text>\
      </svg>';
    var cleaned = svg
      .replace(/{w}/g, width)
      .replace(/{h}/g, height)
      .replace('{t}', text)
      .replace(/[\t\n\r]/gim, '') // Strip newlines and tabs
      .replace(/\s\s+/g, ' ') // Condense multiple spaces
      .replace(/'/gim, '\\i'); // Normalize quotes
    var encoded = encodeURIComponent(cleaned)
      .replace(/\(/g, '%28') // Encode brackets
      .replace(/\)/g, '%29');
    return 'data:image/svg+xml;charset=UTF-8,' + encoded;
  },
  get_image_placeholder: function(text) {
    return CiM.getImagePlaceholder(
      CiM.opt.my_final_size.w, CiM.opt.my_final_size.h, text);
  },

  uploadImage: function(img, callback){
    var imgCanvas = document.createElement("canvas"),
    imgContext = imgCanvas.getContext("2d");
    // Make sure canvas is as big as the picture (needed??)
    imgCanvas.width = img.width;
    imgCanvas.height = img.height;
    // Draw image into canvas element
    imgContext.drawImage(img, 0, 0, img.width, img.height);
    var dataURL = imgCanvas.toDataURL();
    $.ajax({
      type: "POST",
      url: "save-img.php", // see code at the bottom
      data: { 
         imgBase64: dataURL
      }
    }).done(function(resp) {
      if (resp.startsWith('nok')) {
        console.warn('got save error:', resp);
      } else {
        if (callback) callback(resp);
      }
    });
  },
  update_options_for_width: function(w) {
    var o = CiM.opt, //shortcut
        vp_ratio = o.my_final_size.w / o.my_final_size.h,
        h, new_vp_w, new_vp_h;
    w = Math.floor(w * 0.9);
    h = Math.floor(w / o.my_win_ratio);
    o.container.width = w;
    o.container.height = h;
    new_vp_h = 0.6 * h;
    new_vp_w = new_vp_h * vp_ratio;
    // if we adapted to the height, but it's too wide:
    if (new_vp_w > 0.6 * w) { 
      new_vp_w = 0.6 * w;
      new_vp_h = new_vp_w / vp_ratio;
    }
    new_vp_w = Math.floor(new_vp_w);
    new_vp_h = Math.floor(new_vp_h);
    o.viewport.height = new_vp_h;
    o.viewport.width = new_vp_w;    
  },
  
  show_cropme_in_div: function(cropme_div) {
    if (CiM.myCropme)
      CiM.myCropme.destroy();
    CiM.myCropme = new Cropme(cropme_div, CiM.opt);
    CiM.myCropme.bind({ url: CiM.imgHolder.src });        
  }
}

window.onload = function() {
  var croppedImg = $('#cropped-img'),
      savedImg = $('#saved-img');
  CiM.opt.my_final_size = {w:240, h:292};
  CiM.opt.my_win_ratio = 1.5;
  
  //savedImg[0].src = CiM.get_image_placeholder('T');
  
  $('#imgModal-btnCrop').on('click', function() {
    CiM.crop_into_img(croppedImg, function() {
      $('#imgModal-btnSave').show();
      $('#imgModal-btnCrop').hide();
    });
  });
  $('#imgModal-btnSave').on('click', function(){
    alert('Oops - can\'t run PHP in CodePen. Please see bottom of HTML for my suggested PHP');
    return;
    CiM.uploadImage(croppedImg[0], function(path_to_saved) {
      savedImg[0].src = path_to_saved;
      $('#imgModal-dialog').modal('hide');
    });
  });
  $('#btnGetImage').on('click', function(){
    //force 'change' event even if repeating same file:
    $('#fileUpload').prop("value", ""); 
    $('#fileUpload').click();
  });
  $('#fileUpload').on('change', function(){
    CiM.read_file_from_input(/*input elem*/this, function() {
      console.log('image src fully loaded');
      $('#imgModal-dialog').modal('show');
    });           
  });    
  $('#imgModal-dialog').on('shown.bs.modal', function() {
    var cropZone = $('#imgModal-cropme');
    
    CiM.update_options_for_width($('#imgModal-msg').width());
    $('#imgModal-btnSave').hide();
    $('#imgModal-btnCrop').show();
    croppedImg[0].src = '';
    CiM.show_cropme_in_div($('#imgModal-cropme')[0]);
  });
  //window.addEventListener('resize', function(){
    //we might want to reload cropme on resize
  //}, true);
};