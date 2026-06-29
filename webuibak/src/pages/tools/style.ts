import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css, token }) => ({
  summaryGrid: css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 220px));
    gap: ${token.marginMD}px;
    margin-bottom: ${token.marginMD}px;

    @media (max-width: 576px) {
      grid-template-columns: 1fr;
    }
  `,
  summaryCard: css`
    .ant-card-body {
      padding: ${token.paddingMD}px;
    }
  `,
  summaryLabel: css`
    display: block;
    margin-bottom: ${token.marginXXS}px;
  `,
  summaryValue: css`
    margin: 0;
    font-size: 28px;
    font-weight: 600;
    line-height: 1;
    color: ${token.colorText};
  `,
  toolGrid: css`
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: ${token.marginMD}px;

    @media (max-width: 1400px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    @media (max-width: 1100px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 576px) {
      grid-template-columns: 1fr;
    }
  `,
  toolCard: css`
    height: 100%;

    .ant-card-head-title {
      min-width: 0;
    }
  `,
}));
