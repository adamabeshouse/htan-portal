import _ from 'lodash';
import fetch from 'node-fetch';
import { WPAtlas } from '../types';
import {ExploreOptionType} from "./types";
import {toArabic} from "roman-numerals";

export function getRecords(obj: any): any {
    if (_.isObject(obj) || _.isArray(obj)) {
        return _.map(obj, (n: any) => {
            if (n.record_list) {
                return n.record_list;
            } else {
                return getRecords(n);
            }
        });
    } else {
        return undefined;
    }
}

export function massageData(data: any): Entity[] {
    _.forEach(data.atlases, (atlas) => {
        _.forEach(atlas, (t) => {
            const schemaName = t.data_schema;
            if (schemaName) {
                const schema = data.schemas.find(
                    (s: any) => s.data_schema === schemaName.split(':')[1]
                );
                //console.log("here", schema.attributes);
                t.fields = schema.attributes;

                //console.log(t.fields);

                t.record_list = t.record_list.map((record: any) => {
                    const obj: any = {};

                    t.fields.forEach((f: any, i: number) => {
                        obj[f.id.replace(/^bts:/, '')] = record[i];
                    });

                    obj['atlasid'] = atlas.htan_id;

                    return obj;
                });
            }
        });
    });

    const objs = _.chain(getRecords(data))
        .flatMapDeep()
        .filter((n) => !!n)
        .value();

    return objs;
}

export interface Entity {
    atlasid: string;
    AssayType: string;
    Component: string;
    HTANDataFileID: string;
    HTANParentBiospecimenID: string;
    TissueorOrganofOrigin: string;
    PrimaryDiagnosis: string;
    fileFormat: string;
    filename: string;
    HTANParentID: string;
    level: string;
    WPAtlas: WPAtlas;
    biospecimen: Entity | undefined;
    diagnosis: Entity | undefined;
}

export interface Atlas {
    htan_id: string;
    htan_name: string;
}

export async function loadData(WPAtlasData: WPAtlas[]) {
    const data = await fetch('/sim.json').then((r) => r.json());

    const flatData: Entity[] = massageData(data);

    const files = flatData.filter((obj) => {
        return !!obj.filename;
    });

    const biospecimen = flatData.filter((obj) => {
        return obj.Component === 'bts:Biospecimen';
    });

    const diagnoses = flatData.filter((obj) => {
        return obj.Component === 'bts:Diagnosis';
    });

    const atlasMap = _.keyBy(WPAtlasData, (a) => a.htan_id);

    _.forEach(files, (file) => {

        // make a new level property by parsing component
        if (file.Component) {
            const level = file.Component.match(/Level(\d+)/i);
            if (level && level.length > 1) {
                file.level = `Level ${level[1]}`;
            } else {
                file.level = "Unknown";
            }
        } else {
            file.level = "Unknown";
        }

        file.WPAtlas =
            atlasMap[
                `hta${Number(file.atlasid.split('_')[0].substring(3)) + 1}`
            ];

        const specimen = _.find(biospecimen, {
            HTANBiospecimenID: file.HTANParentBiospecimenID,
        }) as Entity | undefined;

        if (specimen) {
            //console.log(specimen);

            const diagnosis = _.find(diagnoses, {
                HTANParticipantID: specimen.HTANParentID,
            }) as Entity | undefined;
            file.diagnosis = diagnosis;
        }

        file.biospecimen = specimen;
        //file.participant =
    });

    return { files, atlases: data.atlases };
}



export function sortStageOptions(options:ExploreOptionType[]){

    const sortedOptions = _.sortBy(options,(option)=>{
        const numeral = option.value.match(/stage ([IVXLCDM]+)/i);
        console.log(numeral);
        let val = undefined;
        if (!!numeral && numeral.length > 1) {
            try {
                const number = toArabic(numeral[1]);
                //val = option.value.replace(new RegExp(numeral[1]))
            } catch (ex) {
                val = numeral[1];
            }
        }
        return option.label;
    });

    const withStage = sortedOptions.filter((option)=>/stage/i.test(option.label));
    const withoutStage = sortedOptions.filter((option)=>!/stage/i.test(option.label));

    return withStage.concat(withoutStage);

    //return options;
}