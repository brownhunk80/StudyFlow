import React from 'react';
import { MilestoneReaderView, MilestoneReaderViewProps } from './MilestoneReaderView';

export interface MilestoneSummaryViewProps extends MilestoneReaderViewProps {}

/**
 * MilestoneSummaryView (Refactored to pure MilestoneReaderView)
 * Exclusively handles reading Compact Overview, Detailed Deep-Dive, and Source Document.
 */
export const MilestoneSummaryView: React.FC<MilestoneSummaryViewProps> = (props) => {
  return <MilestoneReaderView {...props} />;
};

export { MilestoneReaderView };
export default MilestoneSummaryView;
