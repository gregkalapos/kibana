/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import styled from 'styled-components';

import { inputsModel, inputsSelectors, State } from '../../store';
import { inputsActions } from '../../store/actions';
import { timelineSelectors, timelineActions } from '../../../timelines/store/timeline';
import { SubsetTimelineModel, TimelineModel } from '../../../timelines/store/timeline/model';
import { Filter } from '../../../../../../../src/plugins/data/public';
import { EventsViewer } from './events_viewer';
import { InspectButtonContainer } from '../inspect';
import { useFullScreen } from '../../containers/use_full_screen';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererScope } from '../../containers/sourcerer';
import { EventDetailsFlyout } from './event_details_flyout';

const DEFAULT_EVENTS_VIEWER_HEIGHT = 652;

const FullScreenContainer = styled.div<{ $isFullScreen: boolean }>`
  height: ${({ $isFullScreen }) => ($isFullScreen ? '100%' : `${DEFAULT_EVENTS_VIEWER_HEIGHT}px`)};
  flex: 1 1 auto;
  display: flex;
  width: 100%;
`;

export interface OwnProps {
  defaultModel: SubsetTimelineModel;
  end: string;
  id: string;
  scopeId: SourcererScopeName;
  start: string;
  headerFilterGroup?: React.ReactNode;
  pageFilters?: Filter[];
  onRuleChange?: () => void;
  utilityBar?: (refetch: inputsModel.Refetch, totalCount: number) => React.ReactNode;
}

type Props = OwnProps & PropsFromRedux;

const StatefulEventsViewerComponent: React.FC<Props> = ({
  createTimeline,
  columns,
  dataProviders,
  deletedEventIds,
  deleteEventQuery,
  end,
  expandedEvent,
  excludedRowRendererIds,
  filters,
  headerFilterGroup,
  id,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  pageFilters,
  query,
  onRuleChange,
  start,
  scopeId,
  showCheckboxes,
  sort,
  utilityBar,
  // If truthy, the graph viewer (Resolver) is showing
  graphEventId,
}) => {
  const {
    browserFields,
    docValueFields,
    indexPattern,
    selectedPatterns,
    loading: isLoadingIndexPattern,
  } = useSourcererScope(scopeId);
  const { globalFullScreen } = useFullScreen();

  useEffect(() => {
    if (createTimeline != null) {
      createTimeline({
        id,
        columns,
        excludedRowRendererIds,
        indexNames: selectedPatterns,
        sort,
        itemsPerPage,
        showCheckboxes,
      });
    }
    return () => {
      deleteEventQuery({ id, inputId: 'global' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const globalFilters = useMemo(() => [...filters, ...(pageFilters ?? [])], [filters, pageFilters]);

  return (
    <>
      <FullScreenContainer $isFullScreen={globalFullScreen}>
        <InspectButtonContainer>
          <EventsViewer
            browserFields={browserFields}
            columns={columns}
            docValueFields={docValueFields}
            id={id}
            dataProviders={dataProviders!}
            deletedEventIds={deletedEventIds}
            end={end}
            expandedEvent={expandedEvent}
            isLoadingIndexPattern={isLoadingIndexPattern}
            filters={globalFilters}
            headerFilterGroup={headerFilterGroup}
            indexNames={selectedPatterns}
            indexPattern={indexPattern}
            isLive={isLive}
            itemsPerPage={itemsPerPage!}
            itemsPerPageOptions={itemsPerPageOptions!}
            kqlMode={kqlMode}
            query={query}
            onRuleChange={onRuleChange}
            start={start}
            sort={sort}
            utilityBar={utilityBar}
            graphEventId={graphEventId}
          />
        </InspectButtonContainer>
      </FullScreenContainer>
      <EventDetailsFlyout
        browserFields={browserFields}
        docValueFields={docValueFields}
        timelineId={id}
      />
    </>
  );
};

const makeMapStateToProps = () => {
  const getInputsTimeline = inputsSelectors.getTimelineSelector();
  const getGlobalQuerySelector = inputsSelectors.globalQuerySelector();
  const getGlobalFiltersQuerySelector = inputsSelectors.globalFiltersQuerySelector();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State, { id, defaultModel }: OwnProps) => {
    const input: inputsModel.InputsRange = getInputsTimeline(state);
    const timeline: TimelineModel = getTimeline(state, id) ?? defaultModel;
    const {
      columns,
      dataProviders,
      deletedEventIds,
      excludedRowRendererIds,
      expandedEvent,
      graphEventId,
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      sort,
      showCheckboxes,
    } = timeline;

    return {
      columns,
      dataProviders,
      deletedEventIds,
      expandedEvent,
      excludedRowRendererIds,
      filters: getGlobalFiltersQuerySelector(state),
      id,
      isLive: input.policy.kind === 'interval',
      itemsPerPage,
      itemsPerPageOptions,
      kqlMode,
      query: getGlobalQuerySelector(state),
      sort,
      showCheckboxes,
      // Used to determine whether the footer should show (since it is hidden if the graph is showing.)
      // `getTimeline` actually returns `TimelineModel | undefined`
      graphEventId,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  createTimeline: timelineActions.createTimeline,
  deleteEventQuery: inputsActions.deleteOneQuery,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulEventsViewer = connector(
  React.memo(
    StatefulEventsViewerComponent,
    (prevProps, nextProps) =>
      prevProps.id === nextProps.id &&
      prevProps.scopeId === nextProps.scopeId &&
      deepEqual(prevProps.columns, nextProps.columns) &&
      deepEqual(prevProps.dataProviders, nextProps.dataProviders) &&
      deepEqual(prevProps.excludedRowRendererIds, nextProps.excludedRowRendererIds) &&
      prevProps.deletedEventIds === nextProps.deletedEventIds &&
      prevProps.end === nextProps.end &&
      deepEqual(prevProps.filters, nextProps.filters) &&
      prevProps.isLive === nextProps.isLive &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      deepEqual(prevProps.itemsPerPageOptions, nextProps.itemsPerPageOptions) &&
      prevProps.kqlMode === nextProps.kqlMode &&
      deepEqual(prevProps.query, nextProps.query) &&
      deepEqual(prevProps.sort, nextProps.sort) &&
      prevProps.start === nextProps.start &&
      deepEqual(prevProps.pageFilters, nextProps.pageFilters) &&
      prevProps.showCheckboxes === nextProps.showCheckboxes &&
      prevProps.start === nextProps.start &&
      prevProps.utilityBar === nextProps.utilityBar &&
      prevProps.graphEventId === nextProps.graphEventId
  )
);
