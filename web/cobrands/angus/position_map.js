var angus_streetlight_layer = null;
var angus_wfs_url = "http://angus.endpoint.davea.me/datatest/geoserver/services/wfs";
var angus_wfs_feature = "lighting_column_v";

function add_angus_streetlights() {
    if (angus_streetlight_layer !== null) {
        // Layer has already been added
        return;
    }
    if (fixmystreet.map === undefined) {
        // Map's not loaded yet, let's try again soon...
        setTimeout(add_angus_streetlights, 250);
        return;
    }
    if (fixmystreet.page != 'new' && fixmystreet.page != 'around') {
        // We only want to show light markers when making a new report
        return;
    }

    var protocol = new OpenLayers.Protocol.WFS({
        version: "1.1.0",
        url:  angus_wfs_url,
        featureType: angus_wfs_feature,
        geometryName: "g"
    });
    var layer = new OpenLayers.Layer.Vector("WFS", {
        strategies: [new OpenLayers.Strategy.BBOX()],
        protocol: protocol,
        visibility: false,
        maxResolution: 2.388657133579254,
        minResolution: 0.5971642833948135
    });
    angus_streetlight_layer = layer;

    var select_feature = new OpenLayers.Control.SelectFeature( layer );
    layer.events.register( 'featureselected', layer, function(e) {
        var column_id = e.feature.attributes.n;
        $("#form_column_id").val(column_id);
        var lonlat = e.feature.geometry.getBounds().getCenterLonLat();
        // We should already have a problem location pin to move into place
        fixmystreet.markers.features[0].move(lonlat);
    });
    fixmystreet.map.addLayer(layer);
    fixmystreet.map.addControl( select_feature );
    select_feature.activate();

    // Show/hide the streetlight layer when the category is chosen
    $("#problem_form").on("change.category", "select#form_category", function(){
        var category = $(this).val();
        if (category == "Street lighting") {
            layer.setVisibility(true);
        } else {
            layer.setVisibility(false);
        }
    });
}

function position_map_box() {
    var $html = $('html');
    if ($html.hasClass('ie6')) {
        $('#map_box').prependTo('body').css({
            zIndex: 0, position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100%', height: $(window).height(),
            margin: 0
        });
    } else {
        $('#map_box').prependTo('body').css({
            zIndex: 0, position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100%', height: '100%',
            margin: 0
        });
    }
    add_angus_streetlights();
}

function map_fix() {}
var slide_wards_down = 0;
