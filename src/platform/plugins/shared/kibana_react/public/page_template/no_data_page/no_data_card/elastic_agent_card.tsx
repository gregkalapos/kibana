/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { EuiButton, EuiCard, EuiTextColor, EuiScreenReaderOnly, EuiImage } from '@elastic/eui';
import { useKibana } from '../../../context';
import { NoDataPageActions, NO_DATA_RECOMMENDED } from '../no_data_page';

export type ElasticAgentCardProps = NoDataPageActions & {
  solution: string;
};

/**
 * Applies extra styling to a typical EuiAvatar
 */
export const ElasticAgentCard: FunctionComponent<ElasticAgentCardProps> = ({
  solution,
  recommended,
  title,
  href,
  button,
  layout,
  category,
  ...cardRest
}) => {
  const {
    services: { http, application },
  } = useKibana<CoreStart>();
  const addBasePath = http.basePath.prepend;
  const imageUrl = addBasePath(`/plugins/kibanaReact/assets/elastic_agent_card.svg`);
  const canAccessFleet = application.capabilities.navLinks.integrations;
  const hasCategory = category ? `/${category}` : '';

  const image = (
    <EuiImage
      size="fullWidth"
      css={{
        width: 'max(100%, 360px)',
        height: 240,
        objectFit: 'cover',
        background: 'aliceblue',
      }}
      url={imageUrl}
      alt=""
    />
  );

  if (!canAccessFleet) {
    return (
      <EuiCard
        paddingSize="l"
        image={image}
        title={
          <EuiTextColor color="default">
            {i18n.translate('kibana-react.noDataPage.elasticAgentCard.noPermission.title', {
              defaultMessage: `Contact your administrator`,
            })}
          </EuiTextColor>
        }
        description={
          <EuiTextColor color="default">
            {i18n.translate('kibana-react.noDataPage.elasticAgentCard.noPermission.description', {
              defaultMessage: `This integration is not yet enabled. Your administrator has the required permissions to turn it on.`,
            })}
          </EuiTextColor>
        }
        isDisabled
      />
    );
  }

  const defaultCTAtitle = i18n.translate('kibana-react.noDataPage.elasticAgentCard.title', {
    defaultMessage: 'Add Elastic Agent',
  });

  const footer =
    typeof button !== 'string' && typeof button !== 'undefined' ? (
      button
    ) : (
      // The href and/or onClick are attached to the whole Card, so the button is just for show.
      // Do not add the behavior here too or else it will propogate through
      <EuiButton fill>{button || title || defaultCTAtitle}</EuiButton>
    );

  return (
    <RedirectAppLinks
      coreStart={{
        application,
      }}
    >
      <EuiCard
        paddingSize="l"
        image={image}
        href={href ?? addBasePath(`/app/integrations/browse${hasCategory}`)}
        // Bad hack to fix the need for an a11y title even though the button exists
        title={
          <EuiScreenReaderOnly>
            <span>{defaultCTAtitle}</span>
          </EuiScreenReaderOnly>
        }
        description={i18n.translate('kibana-react.noDataPage.elasticAgentCard.description', {
          defaultMessage: `Use Elastic Agent for a simple, unified way to collect data from your machines.`,
        })}
        betaBadgeProps={recommended ? { label: NO_DATA_RECOMMENDED } : undefined}
        footer={footer}
        layout={layout as 'vertical' | undefined}
        {...cardRest}
      />
    </RedirectAppLinks>
  );
};
