import React from 'react';
import HtanNavbar from '../components/HtanNavbar';
import Footer from '../components/Footer';
import _ from 'lodash';
import { loadData, Entity, Atlas } from '../lib/helpers';
import FileTable from '../components/filter/FileTable';
import Select, { ActionMeta, ValueType } from 'react-select';
import getData from '../lib/getData';
import fetch from 'node-fetch';

import { action, computed, makeObservable, observable, toJS } from 'mobx';


import { getAtlasList, WORDPRESS_BASE_URL } from '../ApiUtil';
import { GetStaticProps } from 'next';
import { WPAtlas } from '../types';
import { WPAtlasTable } from '../components/filter/WPAtlasTable';
import { Button } from 'react-bootstrap';
import { observer } from 'mobx-react';
import FilterPanel from '../components/FilterPanel/FilterPanel';
import {
    ExploreOptionType,
    IFilterProps, IFiltersByGroupName,
    PropMap,
    PropNames,
} from '../lib/types';
import FilterCheckList from '../components/FilterPanel/FilterCheckList';

export const getStaticProps: GetStaticProps = async (context) => {
    let slugs = ['summary-blurb-data-release'];
    let overviewURL = `${WORDPRESS_BASE_URL}${JSON.stringify(slugs)}`;
    let res = await fetch(overviewURL);
    //let data = await res.json();

    const atlases = await getAtlasList();

    return {
        props: {
            atlasData: atlases,
            //data,
        },
    };
};

const synapseData = getData();

@observer
class Search extends React.Component<{ wpData: WPAtlas[] }, IFilterProps> {
    constructor(props: any) {
        super(props);
        this.state = { files: [], filters: {}, atlases: [], activeTab: 'file' };

        //@ts-ignore
        if (typeof window !== 'undefined') (window as any).me = this;

        makeObservable(this);
    }

    get getGroupsByProperty() {
        return this.groupsByProperty(this.state.files);
    }

    get getGroupsByPropertyFiltered() {
        return this.groupsByProperty(this.filteredFiles);
    }

    groupsByProperty(files: Entity[]) {
        const m: any = {};
        _.forEach(PropMap, (o, k) => {
            m[k] = _.groupBy(files, (f) => {
                //@ts-ignore
                const val = _.at(f, [o.prop]);
                return val ? val[0] : 'other';
            });
        });
        return m;
    }

    @observable.ref someValue: ExploreOptionType[] = [];

    @computed get selectedFiltersByGroupName() : IFiltersByGroupName {
        return _.groupBy(this.someValue, (item) => {
            return item.group;
        });
    }

    @action.bound
    setFilter(groupNames: string[], actionMeta: ActionMeta<ExploreOptionType>) {
        //const filters = Object.assign({}, this.state.filters);

        if (actionMeta && actionMeta.option) {
            // first remove the item
            this.someValue = this.someValue.filter((o)=>{
                return o.group !== actionMeta!.option!.group! || o.value !== actionMeta!.option!.value!;
            });

            if (actionMeta.action === 'deselect-option') {
                const option = actionMeta.option;
            } else if (actionMeta.action === 'select-option') {
                const option = actionMeta.option;
                this.someValue = this.someValue.concat([option]);
            }
        } else if (actionMeta.action === 'clear') {
            this.someValue = this.someValue.filter((o)=>{
                return o.group !== actionMeta!.option!.group
            });
        }
    }

    componentDidMount(): void {
        const data = loadData(this.props.wpData).then(({ files, atlases }) => {
            const filteredFiles = files.filter((f) => !!f.diagnosis);
            this.setState({ files: filteredFiles, atlases: atlases });
        });
    }

    setTab(activeTab: string) {
        this.setState({ activeTab });
    }

    filterFiles(filters: { [key: string]: ExploreOptionType[] }, files: Entity[]) {
        if (_.size(filters)) {



            // find the files where the passed filters match
            return files.filter((f) => {
                return _.every(filters, (filter, name) => {
                    //@ts-ignore
                    const val = _.at(f, PropMap[name].prop);
                    //@ts-ignore
                    return val ? filter.map((f)=>f.value).includes(val[0]) : false;
                });
            });
        } else {
            return files;
        }
    }

    makeOptions(propName: string): ExploreOptionType[] {
        const filteredFilesMinusOption = this.groupsByProperty(
            this.filterFiles(
                _.omit(this.selectedFiltersByGroupName, [propName]),
                this.state.files
            )
        )[propName];

        return _.map(this.getGroupsByProperty[propName], (val, key) => {
            const count = key in filteredFilesMinusOption ? filteredFilesMinusOption[key].length : 0;
            return {
                value: key,
                label: `${key} (${count})`,
                group: propName,
                count
            };
        });
    }

    isOptionSelected = (option:ExploreOptionType) => {
        return (
            _.find(this.someValue,
                (o:ExploreOptionType) => o.value === option.value && option.group === o.group
            ) !== undefined
        );
    };

    get filteredFiles() {
        return this.filterFiles(this.selectedFiltersByGroupName, this.state.files);
    }

    @action.bound handleChange(
        value: any,
        actionMeta: ActionMeta<ExploreOptionType>
    ) {
        value.forEach((valueType: string) => {
            this.someValue = this.someValue.concat([actionMeta.option!]);
        });
    }

    render() {
        var self = this;

        //@ts-ignore
        const patients = _(this.filteredFiles)
            .filter((f) => f.biospecimen && f.biospecimen.HTANParentID)
            .map((f: any) => f.biospecimen?.HTANParentID)
            .uniq()
            .value().length;

        if (this.filteredFiles) {
            return (
                <div style={{ padding: 20 }}>
                    <div className="subnav">
                        <ul className="nav nav-tabs">
                            <li className="nav-item">
                                <a
                                    onClick={() => this.setTab('atlas')}
                                    className={`nav-link ${
                                        this.state.activeTab === 'atlas'
                                            ? 'active'
                                            : ''
                                    }`}
                                >
                                    Atlases
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link disabled">Cases</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link disabled">
                                    Biospecimens
                                </a>
                            </li>
                            <li className="nav-item">
                                <a
                                    onClick={() => this.setTab('file')}
                                    className={`nav-link ${
                                        this.state.activeTab === 'file'
                                            ? 'active'
                                            : ''
                                    }`}
                                >
                                    Files
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div
                        className={`tab-content fileTab ${
                            this.state.activeTab !== 'file' ? 'd-none' : ''
                        }`}
                    >
                        <div className="filterControls">

                            <div>
                                <div style={{ width: 300 }}>
                                    <Select
                                        isSearchable
                                        isClearable={false}
                                        name="searchAll"
                                        placeholder="Search all filters"
                                        controlShouldRenderValue={false}
                                        isMulti={true}
                                        options={[
                                            PropNames.AtlasName,
                                            PropNames.TissueorOrganofOrigin,
                                            PropNames.PrimaryDiagnosis,
                                            PropNames.Component,
                                            PropNames.Stage
                                        ].map((propName) => {
                                            return {
                                                label:
                                                    PropMap[propName]
                                                        .displayName,
                                                options: this.makeOptions(
                                                    propName
                                                ).map((option) =>
                                                    Object.assign(option, {
                                                        group: propName,
                                                    })
                                                ),
                                            };
                                        })}
                                        hideSelectedOptions={false}
                                        closeMenuOnSelect={false}
                                        onChange={this.handleChange}
                                        isOptionSelected={this.isOptionSelected}
                                        value={
                                            this.selectedFiltersByGroupName[
                                                PropNames.AtlasName
                                            ]
                                        }
                                    />
                                </div>
                            </div>

                            <div>
                                <div style={{ width: 300 }}>
                                    <FilterPanel>
                                        <div
                                            className={
                                                'filter-checkbox-list-container'
                                            }
                                        >
                                            <div>
                                                <h4>Cancer Type:</h4>
                                                {
                                                    <FilterCheckList
                                                        setFilter={
                                                            this.setFilter
                                                        }
                                                        filters={this.selectedFiltersByGroupName}
                                                        options={this.makeOptions(
                                                            PropNames.PrimaryDiagnosis
                                                        )}
                                                    ></FilterCheckList>
                                                }
                                            </div>
                                            <div>
                                                <h4>Stage:</h4>
                                                {
                                                    <FilterCheckList
                                                        setFilter={
                                                            this.setFilter
                                                        }
                                                        filters={this.selectedFiltersByGroupName}
                                                        options={this.makeOptions(
                                                            PropNames.Stage
                                                        )}
                                                    ></FilterCheckList>
                                                }
                                            </div>
                                        </div>
                                    </FilterPanel>
                                </div>
                            </div>

                            <div>
                                <div style={{ width: 300 }}>
                                    <Select
                                        placeholder="Atlas"
                                        controlShouldRenderValue={false}
                                        isClearable={false}
                                        isSearchable
                                        name="color"
                                        isMulti={true}
                                        options={this.makeOptions(
                                            PropNames.AtlasName
                                        )}
                                        hideSelectedOptions={false}
                                        closeMenuOnSelect={false}
                                        onChange={this.handleChange}
                                        value={
                                            this.selectedFiltersByGroupName[
                                                PropNames.AtlasName
                                            ]
                                        }
                                    />
                                </div>
                            </div>

                            <div>
                                <div style={{ width: 300 }}>
                                    <Select
                                        placeholder="Organ"
                                        controlShouldRenderValue={false}
                                        isClearable={false}
                                        isSearchable
                                        name="color"
                                        isMulti={true}
                                        options={this.makeOptions(
                                            PropNames.TissueorOrganofOrigin
                                        )}
                                        hideSelectedOptions={false}
                                        closeMenuOnSelect={false}
                                        onChange={this.handleChange}
                                        value={
                                            this.selectedFiltersByGroupName[
                                                PropNames.TissueorOrganofOrigin
                                            ]
                                        }
                                    />
                                </div>
                            </div>


                            <div>
                                <div style={{ width: 300 }}>
                                    <Select
                                        placeholder="Assay"
                                        controlShouldRenderValue={false}
                                        isClearable={false}
                                        isSearchable
                                        name="color"
                                        isMulti={true}
                                        options={this.makeOptions(
                                            PropNames.Component
                                        )}
                                        hideSelectedOptions={false}
                                        closeMenuOnSelect={false}
                                        onChange={(
                                            value: any,
                                            actionMeta: ActionMeta<
                                                ExploreOptionType
                                            >
                                        ) => {
                                            this.setFilter(
                                                [PropNames.Component],
                                                actionMeta
                                            );
                                        }}
                                        isOptionSelected={this.isOptionSelected}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={'filter'}>
                            {Object.keys(this.selectedFiltersByGroupName).map(
                                (filter, i, filters) => {
                                    const numberOfAttributes = filters.length;
                                    const addAnd =
                                        numberOfAttributes > 1 &&
                                        i < numberOfAttributes - 1 ? (
                                            <span className="logicalAnd">
                                                AND
                                            </span>
                                        ) : null;

                                    return (
                                        <span className="attributeGroup">
                                            <span
                                                className="attributeGroupName"
                                                onClick={() => {
                                                    this.setFilter([filter], {
                                                        action: 'clear',
                                                    });
                                                }}
                                            >
                                                {
                                                    PropMap[
                                                        PropNames[
                                                            filter as keyof typeof PropNames
                                                        ]
                                                    ].displayName
                                                }
                                            </span>

                                            {this.selectedFiltersByGroupName[filter].map(
                                                (value, i, values) => {
                                                    const numberOfValues =
                                                        values.length;
                                                    const openParenthesis =
                                                        numberOfValues > 1 &&
                                                        i == 0 ? (
                                                            <span className="logicalParentheses">
                                                                (
                                                            </span>
                                                        ) : null;
                                                    const addOr =
                                                        numberOfValues > 1 &&
                                                        i <
                                                            numberOfValues -
                                                                1 ? (
                                                            <span className="logicalOr">
                                                                OR
                                                            </span>
                                                        ) : null;
                                                    const closeParenthesis =
                                                        numberOfValues > 1 &&
                                                        i ==
                                                            numberOfValues -
                                                                1 ? (
                                                            <span className="logicalParentheses">
                                                                )
                                                            </span>
                                                        ) : null;

                                                    return (
                                                        <span className="attributeValues">
                                                            {openParenthesis}
                                                            <span
                                                                className="attributeValue"
                                                                onClick={() => {
                                                                    this.setFilter(
                                                                        [
                                                                            filter,
                                                                        ],
                                                                        {
                                                                            action:
                                                                                'deselect-option',
                                                                            option: {
                                                                                label:
                                                                                    '',
                                                                                value:value.value,
                                                                                group: filter,
                                                                            },
                                                                        }
                                                                    );
                                                                }}
                                                            >
                                                                {value.value}
                                                            </span>
                                                            {addOr}
                                                            {closeParenthesis}
                                                        </span>
                                                    );
                                                }
                                            )}
                                            {addAnd}
                                        </span>
                                    );
                                }
                            )}
                        </div>

                        <div className={'summary'}>
                            <div>
                                <strong>Summary:</strong>
                            </div>

                            <div>{this.filteredFiles.length} Files</div>

                            <div>
                                {
                                    _.keys(
                                        this.getGroupsByPropertyFiltered[
                                            PropNames.AtlasName
                                        ]
                                    ).length
                                }{' '}
                                Atlases
                            </div>

                            <div>
                                {
                                    _.keys(
                                        this.getGroupsByPropertyFiltered[
                                            PropNames.TissueorOrganofOrigin
                                        ]
                                    ).length
                                }{' '}
                                Organs
                            </div>

                            <div>
                                {
                                    _.keys(
                                        this.getGroupsByPropertyFiltered[
                                            PropNames.PrimaryDiagnosis
                                        ]
                                    ).length
                                }{' '}
                                Cancer Types
                            </div>

                            <div>{patients} Cases</div>

                            <div>
                                {
                                    _(this.filteredFiles)
                                        .map((f) => f.HTANParentBiospecimenID)
                                        .uniq()
                                        .value().length
                                }{' '}
                                Biospecimens
                            </div>

                            <div>
                                {
                                    _.keys(
                                        this.getGroupsByPropertyFiltered[
                                            PropNames.Component
                                        ]
                                    ).length
                                }{' '}
                                Assays
                            </div>
                        </div>
                        <FileTable
                            entities={this.filteredFiles}
                        ></FileTable>
                        <Button
                            href="/explore"
                            variant="primary"
                            className="mr-4"
                        >
                            Download
                        </Button>
                    </div>

                    <div
                        className={`tab-content atlasTab ${
                            this.state.activeTab !== 'atlas' ? 'd-none' : ''
                        }`}
                    >
                        <WPAtlasTable atlasData={this.props.wpData} />
                    </div>
                </div>
            );
        }
    }
}

interface IFilterPageProps {
    atlasData: any;
}

const FilterPage = (props: IFilterProps) => {
    return (
        <>
            <HtanNavbar />

            <Search wpData={props.atlasData} />

            <Footer />
        </>
    );
};

export default FilterPage;
