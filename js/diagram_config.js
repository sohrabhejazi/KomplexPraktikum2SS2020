// file contains general parameters (js vars), used for diagram-creation

// encounter, conditions, ... - ressources/entries are displayed below value-diagram
// with the following keys for a lookup in data:
var align_data = ["encounter", "conditions", "labRequest", "mibiRequest", "mibiObservations", "abgObservations", "medication"];
// with the following label the represented data will be displayed (align_data specifies order)
var display_data = ["Fälle", "Diagnosen", "Laboranfrage", "Antibiogramme", "- Ergebnisse", "- Resistenzen", "Medikamente"];

// since we need to create + get displayed svg-elements, we use a general id-seperator for type and id
var id_sep = "--";  // eg. element with id "path--3141-9" is the created value-line for code 3141-9

// function to call for parsing given stringdates
var formatDate = d3.timeParse("%d.%m.%Y %H:%M:%S");

// specify data-value-groups, that should be shown in the value-diagram-part, key is the key that can be used for the lookup in data
// name: display-group name for checkbox-group. marker: svg-element to represent values from this group
// in fetched var data, the values for single value-points should be found with key "value"
var value_groups = {
    "labObservations": {
        "name": "Laborergebnisse",
        "marker": "circle"
    },
    "observations": {
        "name": "Beobachtungen",
        "marker": "rect"
    }
}

// also normed range limits can be shown, they can be found via keys low and high
var rangeLimits = ["low", "high"];

// to scale X we need to check all date columns for every data-part in data. date_columns stores columns with dates
var date_columns = {
    "abgObservations": ["date"],
    "conditions": ["date"],
    "diagnostics": [],
    "encounter": ["start", "end"],
    "labObservations": ["date"],
    "labRequest": ["authoredOn"],
    "medication": ["date", "end"],  // end is calculated in app.js
    "mibiObservations": ["date"],
    "mibiRequest": ["authoredOn"],
    "observations": ["date"],
    "specimen": []
}

// some bootstrap-like colors, used for coloring encounters and other elements
var pltColors = {
    "primary": "#0275d8",
    "secondary": "#5bc0de",
    "results": "#f0ad4e"
}

var style = {  // for one diagram
    "totalHeight": 490,
    "margin": {top: 20, right: 10, bottom: 20, left: 120}
};
