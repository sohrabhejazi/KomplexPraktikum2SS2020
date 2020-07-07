function displayData() {
    displayPatient(data.patient);
    for (enc in data.encounter) {
        displayEncounterSelection(enc);
        displayConditions(enc, getConditionsOfEncounter(enc));
        displayObservation(enc, getObservationsOfEncounter(enc));
        displayMedication(enc, getMedicationsOfEncounter(enc));
        displaylabObservation(enc, getLabObservationsOfEncounter(enc));
        displayAntibiograms(enc, getAntibiogramsOfEncounter(enc));
    }
}

function getConditionsOfEncounter(enc) {
    var conditions = new Array();
    for (cond in data.conditions) {
        if (data.conditions[cond].encounter === enc) {
            conditions.push(data.conditions[cond]);
        }
    }
    return conditions;
}

function getObservationsOfEncounter(enc) {
    var observations = new Array();
    for (obs in data.observations) {
        if (data.observations[obs].encounter === enc) {
            observations.push(data.observations[obs]);
        }
    }
    return observations;
}

function getMedicationsOfEncounter(enc) {
    var medications = new Array();
    for (med in data.medication) {
        if (data.medication[med].encounter === enc) {
            medications.push(data.medication[med]);
        }
    }
    return medications;
}

function getLabObservationsOfEncounter(enc) {
    var labObservations = new Array();
    for (lab in data.labObservations) {
        if (data.labObservations[lab].encounter === enc) {
            labObservations.push(data.labObservations[lab]);
        }
    }
    return labObservations;
}

function getAntibiogramsOfEncounter(enc) {
    var antibiograms = new Array();
    for (abg in data.mibiRequest) {
        if (data.mibiRequest[abg].encounter === enc) {
            antibiograms.push(data.mibiRequest[abg]);
        }
    }
    return antibiograms;
}

function displayInformation(id, information) {
    var element = document.getElementById(id);
    element.innerHTML = information;
}

function displayPatient(patient) {
    displayInformation("patientName", patient.name);
    displayInformation("patientGender", patient.gender);
    displayInformation("patientAge", patient.age);
    displayInformation("patientAddress", patient.address);
}

function importNode(parent, parentAppend, selector, value) {
    var item = parent.content.querySelector(selector);
    var itemCopy = document.importNode(item, true);
    itemCopy.innerHTML = value;
    parentAppend.appendChild(itemCopy);
    return itemCopy;
}

function displayEncounterSelection(encindex) {
    var checkboxContainer = document.getElementById("encounterSelection");
    var checkboxTemplate = document.getElementById("encounterEntrySelection").cloneNode(true);

    var checkbox = checkboxTemplate.content.querySelector("input");
    var checkboxCopy = document.importNode(checkbox, true);
    checkboxCopy.id = "encounterSelection" + encindex;
    checkboxCopy.onclick = function() {
        encounterContentFilter(encindex);
    }
    checkboxContainer.appendChild(checkboxCopy);

    var label = document.createTextNode(" " + data.encounter[encindex].start + " - " + data.encounter[encindex].end);
    checkboxContainer.appendChild(label);
    checkboxContainer.appendChild(document.createElement("br"));
}

function displayConditions(encindex, conditions) {
    if (conditions.length > 0) {
        var encounterElem = document.getElementById("conditionContent");

        var div = document.createElement("div");
        div.id = "conditions" + encindex;
        encounterElem.appendChild(div);

        var encounterEntryTemplate = document.getElementById("encounterEntry").cloneNode(true);
        importNode(encounterEntryTemplate, div, ".encounterStart", "Zeitraum: " + data.encounter[encindex].start);
        importNode(encounterEntryTemplate, div, ".encounterEnd", " - " + data.encounter[encindex].end);

        var conditionTableTemplate = document.getElementById("conditionTable").cloneNode(true);
        var table = conditionTableTemplate.content.querySelector(".table-responsive");
        var tableCopy = document.importNode(table, true);
        tableCopy.getElementsByTagName("tbody")[0].id = "conditionEntries" + encindex;
        div.appendChild(tableCopy);
        
        for (c in conditions) {
            var conditionTable = document.getElementById("conditionEntries" + encindex);
            var conditionTableEntryTemplate = document.getElementById("conditionTableEntry").cloneNode(true);

            var tableRow = importNode(conditionTableEntryTemplate, conditionTable, ".condition", "");
            importNode(conditionTableEntryTemplate, tableRow, ".cond_rank", conditions[c].rank);
            importNode(conditionTableEntryTemplate, tableRow, ".cond_display", conditions[c].display);
            importNode(conditionTableEntryTemplate, tableRow, ".cond_code", conditions[c].code);
            importNode(conditionTableEntryTemplate, tableRow, ".cond_date", conditions[c].date);
        }
    }
}

function displayObservation(encindex, observations) {
    if (observations.length > 0) {
        var observationElem = document.getElementById("observationContent");

        var div = document.createElement("div");
        div.id = "observations" + encindex;
        observationElem.appendChild(div);

        var observationEntryTemplate = document.getElementById("encounterEntry").cloneNode(true);
        importNode(observationEntryTemplate, div, ".encounterStart", "Zeitraum: " + data.encounter[encindex].start);
        importNode(observationEntryTemplate, div, ".encounterEnd", " - " + data.encounter[encindex].end);

        var observationTableTemplate = document.getElementById("observationTable").cloneNode(true);
        var table = observationTableTemplate.content.querySelector(".table-responsive");
        var tableCopy = document.importNode(table, true);
        tableCopy.getElementsByTagName("tbody")[0].id = "observationEntries" + encindex;
        div.appendChild(tableCopy);

        for (o in observations) {
            var observationTable = document.getElementById("observationEntries" + encindex);
            var observationTableEntryTemplate = document.getElementById("observationTableEntry").cloneNode(true);

            var valueUnit;
            for (unit in data.values) {
                if (unit == observations[o].range) {
                    valueUnit = data.values[unit].unit;
                }
            }

            var tableRow = importNode(observationTableEntryTemplate, observationTable, ".observation", "");
            importNode(observationTableEntryTemplate, tableRow, ".obs_display", observations[o].display);
            importNode(observationTableEntryTemplate, tableRow, ".obs_value", observations[o].value + " " + valueUnit);
            importNode(observationTableEntryTemplate, tableRow, ".obs_code", observations[o].code);
            importNode(observationTableEntryTemplate, tableRow, ".obs_date", observations[o].date);
        }
    }
}

function displayMedication(encindex, medications) {
    if (medications.length > 0) {
        var medicationElem = document.getElementById("medicationContent");

        var div = document.createElement("div");
        div.id = "medications" + encindex;
        medicationElem.appendChild(div);

        var medicationEntryTemplate = document.getElementById("encounterEntry").cloneNode(true);
        importNode(medicationEntryTemplate, div, ".encounterStart", "Zeitraum: " + data.encounter[encindex].start);
        importNode(medicationEntryTemplate, div, ".encounterEnd", " - " + data.encounter[encindex].end);

        var medicationTableTemplate = document.getElementById("medicationTable").cloneNode(true);
        var table = medicationTableTemplate.content.querySelector(".table-responsive");
        var tableCopy = document.importNode(table, true);
        tableCopy.getElementsByTagName("tbody")[0].id = "medicationEntries" + encindex;
        div.appendChild(tableCopy);

        for (m in medications) {
            var medicationTable = document.getElementById("medicationEntries" + encindex);
            var medicationTableEntryTemplate = document.getElementById("medicationTableEntry").cloneNode(true);

            var tableRow = importNode(medicationTableEntryTemplate, medicationTable, ".medication", "");
            importNode(medicationTableEntryTemplate, tableRow, ".med_display", medications[m].display);
            importNode(medicationTableEntryTemplate, tableRow, ".med_dose", medications[m].dose);
            importNode(medicationTableEntryTemplate, tableRow, ".med_interval", medications[m].interval_h);
            importNode(medicationTableEntryTemplate, tableRow, ".med_duration", medications[m].duration_in_d);
            importNode(medicationTableEntryTemplate, tableRow, ".med_application", medications[m].application.text);
            importNode(medicationTableEntryTemplate, tableRow, ".med_code", medications[m].code);
            importNode(medicationTableEntryTemplate, tableRow, ".med_date", medications[m].date);
        }
    }
}

function displaylabObservation(encindex, labObservations) {
    if (labObservations.length > 0) {
        var labObservationElem = document.getElementById("labObservationContent");

        var div = document.createElement("div");
        div.id = "labObservations" + encindex;
        labObservationElem.appendChild(div);

        var labObservationEntryTemplate = document.getElementById("encounterEntry").cloneNode(true);
        importNode(labObservationEntryTemplate, div, ".encounterStart", "Zeitraum: " + data.encounter[encindex].start);
        importNode(labObservationEntryTemplate, div, ".encounterEnd", " - " + data.encounter[encindex].end);

        var labObservationTableTemplate = document.getElementById("labObservationTable").cloneNode(true);
        var table = labObservationTableTemplate.content.querySelector(".table-responsive");
        var tableCopy = document.importNode(table, true);
        tableCopy.getElementsByTagName("tbody")[0].id = "labObservationEntries" + encindex;
        div.appendChild(tableCopy);

        for (l in labObservations) {
            var labObservationTable = document.getElementById("labObservationEntries" + encindex);
            var labObservationTableEntryTemplate = document.getElementById("labObservationTableEntry").cloneNode(true);

            var valueUnit;
            var valueLow;
            var valueHigh;
            for (unit in data.values) {
                if (unit == labObservations[l].range) {
                    valueUnit = data.values[unit].unit;
                    valueLow = data.values[unit].low;
                    valueHigh = data.values[unit].high;
                }
            }

            var tableRow = importNode(labObservationTableEntryTemplate, labObservationTable, ".labObservation", "");
            importNode(labObservationTableEntryTemplate, tableRow, ".labObs_display", labObservations[l].display);
            importNode(labObservationTableEntryTemplate, tableRow, ".labObs_value", labObservations[l].value + " " + valueUnit);
            importNode(labObservationTableEntryTemplate, tableRow, ".labObs_low", valueLow + " " + valueUnit);
            importNode(labObservationTableEntryTemplate, tableRow, ".labObs_high", valueHigh + " " + valueUnit);
            importNode(labObservationTableEntryTemplate, tableRow, ".labObs_code", labObservations[l].code);
            importNode(labObservationTableEntryTemplate, tableRow, ".labObs_date", labObservations[l].date);
        }
    }
}

function displayAntibiograms(encindex, antibiograms) {
    if (antibiograms.length > 0) {
        var antibiogramElem = document.getElementById("antibiogramContent");

        var div = document.createElement("div");
        div.id = "antibiograms" + encindex;
        antibiogramElem.appendChild(div);

        var antibiogramEntryTemplate = document.getElementById("encounterEntry").cloneNode(true);
        importNode(antibiogramEntryTemplate, div, ".encounterStart", "Zeitraum: " + data.encounter[encindex].start);
        importNode(antibiogramEntryTemplate, div, ".encounterEnd", " - " + data.encounter[encindex].end);

        var antibiogramTableTemplate = document.getElementById("antibiogramTable").cloneNode(true);
        var table = antibiogramTableTemplate.content.querySelector(".table-responsive");
        var tableCopy = document.importNode(table, true);
        tableCopy.getElementsByTagName("tbody")[0].id = "antibiogramEntries" + encindex;
        div.appendChild(tableCopy);

        for (abg in antibiograms) {
            var antibiogramTable = document.getElementById("antibiogramEntries" + encindex);
            var antibiogramTableEntryTemplate = document.getElementById("antibiogramTableEntry").cloneNode(true);

            var specimen;
            for (sm in data.specimen) {
                if (sm == antibiograms[abg].specimen) {
                    specimen = data.specimen[sm];
                }
            }

            var tableRow = importNode(antibiogramTableEntryTemplate, antibiogramTable, ".antibiogram", "");
            importNode(antibiogramTableEntryTemplate, tableRow, ".abg_display", specimen.display);
            importNode(antibiogramTableEntryTemplate, tableRow, ".abg_code", specimen.code);
            importNode(antibiogramTableEntryTemplate, tableRow, ".abg_date", antibiograms[abg].authoredOn);

            var diagnostics = new Array();
            for (dia in data.diagnostics) {
                if (data.diagnostics[dia].serviceRequest == antibiograms[abg].id) {
                    diagnostics.push(data.diagnostics[dia]);
                }
            }

            if (diagnostics.length > 0) {
                var tr = document.createElement("tr");
                antibiogramTable.appendChild(tr);
                var td = document.createElement("td");
                td.colSpan = "3";
                tr.appendChild(td);

                var diagnosticsTableTemplate = document.getElementById("diagnosticsTable").cloneNode(true);
                var table2 = diagnosticsTableTemplate.content.querySelector(".table");
                var tableCopy2 = document.importNode(table2, true);
                tableCopy2.getElementsByTagName("tbody")[0].id = "diagnosticsEntries" + abg;
                td.appendChild(tableCopy2);

                for (dia in diagnostics) {
                    var diagnosticsTable = document.getElementById("diagnosticsEntries" + abg);
                    var diagnosticsTableEntryTemplate = document.getElementById("diagnosticsTableEntry").cloneNode(true);

                    var result;
                    for (mibi in data.mibiObservations) {
                        if (diagnostics[dia].result == mibi) {
                            result = data.mibiObservations[mibi];
                        }
                    }

                    var tooltipContent;
                    if (result.abgObservations.length > 0) {
                        var abgObservations = new Array();
                        for (abgObs in data.abgObservations) {
                            if (data.abgObservations[abgObs].mibiObservation == result.id) {
                                abgObservations.push(data.abgObservations[abgObs]);
                            }
                        }

                        tooltipContent = "<table class='table table-sm border'><thead><th scope='col'>Antibiotika</th><th scope='col'>Resistenz</th><th scope='col'>Datum</th></thead><tbody>";
                        for (abgObs in abgObservations) {
                            tooltipContent += "<tr><td>" + abgObservations[abgObs].code + "</td><td>" + abgObservations[abgObs].interpretation + "</td><td>" + abgObservations[abgObs].date + "</td></tr>";
                        }
                        tooltipContent += "</tbody></table>";                       
                    }

                    var tableRow = importNode(diagnosticsTableEntryTemplate, diagnosticsTable, ".diagnostic", "");
                    importNode(diagnosticsTableEntryTemplate, tableRow, ".dia_display", diagnostics[dia].display);
                    importNode(diagnosticsTableEntryTemplate, tableRow, ".dia_code", diagnostics[dia].code);
                    importNode(diagnosticsTableEntryTemplate, tableRow, ".dia_result", result.display);

                    if (result.abgObservations.length > 0) {
                        var tooltipContainerDiv = document.createElement("div");
                        tooltipContainerDiv.classList.add("resistancetooltip");

                        var img = document.createElement("img");
                        img.src = "images/info.svg";
                        tooltipContainerDiv.appendChild(img);

                        var tooltipDiv = document.createElement("div");
                        tooltipDiv.classList.add("tooltiptext");
                        tooltipDiv.innerHTML = tooltipContent;
                        tooltipContainerDiv.appendChild(tooltipDiv);

                        var item = diagnosticsTableEntryTemplate.content.querySelector(".dia_resistances");
                        var itemCopy = document.importNode(item, true);
                        itemCopy.appendChild(tooltipContainerDiv);
                        tableRow.appendChild(itemCopy);
                    } else {
                        importNode(diagnosticsTableEntryTemplate, tableRow, ".dia_resistances", "");
                    }
                    
                    importNode(diagnosticsTableEntryTemplate, tableRow, ".dia_date", result.date);
                }
            }
        }
    }
}

