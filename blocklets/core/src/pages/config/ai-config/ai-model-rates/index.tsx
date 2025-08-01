import { CreditRateFormula } from '@app/components/credit-rate-farmula';
import { getPrefix } from '@app/libs/util';
import Dialog from '@arcblock/ux/lib/Dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
/* eslint-disable react/no-unstable-nested-components */
import Toast from '@arcblock/ux/lib/Toast';
import { Table } from '@blocklet/aigne-hub/components';
import styled from '@emotion/styled';
import { Add as AddIcon, InfoOutlined } from '@mui/icons-material';
import { Avatar, Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { joinURL } from 'ufo';

import { useSessionContext } from '../../../../contexts/session';
import ModelRateForm from './model-rate-form';
import { ModelRate, ModelRateFormData } from './types';

// 格式化小数字，统一使用科学计数法
const formatSmallNumber = (num: number) => {
  if (num === 0) return '0';

  // 统一使用科学计数法，最多保留2位，末尾0不展示
  let formatted = num.toExponential(2);
  // 去掉末尾的0和可能多余的小数点
  formatted = formatted.replace(/\.?0+e/, 'e');
  return formatted;
};

export default function AIModelRates() {
  const { t } = useLocaleContext();
  const { api } = useSessionContext();
  const [modelRates, setModelRates] = useState<ModelRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<ModelRate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState<ModelRate | null>(null);

  // 从 blocklet preferences 获取配置
  const baseCreditPrice = window.blocklet?.preferences?.baseCreditPrice || 0.0000025;
  const targetProfitMargin = window.blocklet?.preferences?.targetProfitMargin || 0;

  // 获取所有模型费率
  const fetchModelRates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/ai-providers/model-rates');
      setModelRates(response.data || []);
    } catch (error: any) {
      Toast.error(error.message || t('config.modelRates.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 创建模型费率
  const handleCreateModelRate = async (data: ModelRateFormData) => {
    try {
      await api.post('/api/ai-providers/model-rates', {
        model: data.modelName,
        modelDisplay: data.modelDisplay,
        type: data.rateType,
        inputRate: data.inputRate,
        outputRate: data.outputRate,
        description: data.description,
        providers: data.providers,
        unitCosts: data.unitCosts,
      });

      Toast.success(t('config.modelRates.createSuccess'));

      await fetchModelRates();
      setShowForm(false);
      setEditingRate(null);
    } catch (error: any) {
      // Handle detailed error messages from the API
      const errorMessage = error.response?.data?.error || error.message || t('config.modelRates.createFailed');
      Toast.error(errorMessage);
    }
  };

  // 更新模型费率
  const handleUpdateModelRate = async (data: ModelRateFormData) => {
    if (!editingRate) return;
    try {
      await api.put(`/api/ai-providers/${editingRate.provider.id}/model-rates/${editingRate.id}`, {
        modelDisplay: data.modelDisplay,
        inputRate: data.inputRate,
        outputRate: data.outputRate,
        description: data.description,
      });
      await fetchModelRates();
      setEditingRate(null);
      setShowForm(false);
      Toast.success(t('config.modelRates.updateSuccess'));
    } catch (error: any) {
      Toast.error(error.message || t('config.modelRates.updateFailed'));
    }
  };

  // 删除费率
  const handleDeleteRate = async () => {
    if (!rateToDelete) return;
    try {
      await api.delete(`/api/ai-providers/${rateToDelete.provider.id}/model-rates/${rateToDelete.id}`);
      await fetchModelRates();
      Toast.success(t('config.modelRates.deleteSuccess'));
      setDeleteDialogOpen(false);
      setRateToDelete(null);
    } catch (error: any) {
      Toast.error(error.message || t('config.modelRates.deleteFailed'));
    }
  };

  const handleEditRate = (rate: ModelRate) => {
    setEditingRate(rate);
    setShowForm(true);
  };

  const handleDeleteClick = (rate: ModelRate) => {
    setRateToDelete(rate);
    setDeleteDialogOpen(true);
  };

  const getRateTypeColor = (type: string) => {
    switch (type) {
      case 'chatCompletion':
        return 'primary';
      case 'imageGeneration':
        return 'secondary';
      case 'embedding':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRateTypeText = (type: string) => {
    switch (type) {
      case 'chatCompletion':
        return t('config.modelRates.types.chatCompletion');
      case 'imageGeneration':
        return t('config.modelRates.types.imageGeneration');
      case 'embedding':
        return t('config.modelRates.types.embedding');
      default:
        return type;
    }
  };

  // 表格列定义
  const columns = [
    {
      name: 'modelDisplay',
      label: t('config.modelRates.fields.modelName'),
      options: {
        customBodyRender: (_value: any, tableMeta: any) => {
          const rate = modelRates[tableMeta.rowIndex];
          if (!rate) return null;

          return (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 'medium',
              }}>
              {rate.modelDisplay || rate.model}
            </Typography>
          );
        },
      },
    },
    {
      name: 'provider',
      label: t('config.modelRates.fields.provider'),
      options: {
        customBodyRender: (_value: any, tableMeta: any) => {
          const rate = modelRates[tableMeta.rowIndex];
          if (!rate) return null;

          return (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Avatar
                src={joinURL(getPrefix(), `/logo/${rate.provider.name}.png`)}
                sx={{ width: 24, height: 24 }}
                alt={rate.provider.displayName}
              />
              <Typography variant="body2">{rate.provider.displayName}</Typography>
            </Stack>
          );
        },
      },
    },
    {
      name: 'type',
      label: t('config.modelRates.fields.type'),

      options: {
        customHeaderRender: () => {
          return (
            <Typography variant="body2">
              {t('config.modelRates.fields.type')}
              <Tooltip title={t('config.modelRates.fields.type.tooltip')}>
                <InfoOutlined sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Typography>
          );
        },
        customBodyRender: (_value: any, tableMeta: any) => {
          const rate = modelRates[tableMeta.rowIndex];
          if (!rate) return null;

          return (
            <Chip
              label={getRateTypeText(rate.type)}
              color={getRateTypeColor(rate.type) as any}
              size="small"
              variant="filled"
            />
          );
        },
      },
    },
    {
      name: 'inputRate',
      label: t('config.modelRates.fields.inputRate'),
      options: {
        customHeadLabelRender: () => {
          return (
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('config.modelRates.fields.inputRate')}
              <Tooltip title={t('config.modelRates.configInfo.inputTokenConsumption')}>
                <InfoOutlined sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Typography>
          );
        },
        customBodyRender: (_value: any, tableMeta: any) => {
          const rate = modelRates[tableMeta.rowIndex];
          if (!rate) return null;

          const actualInputCost = Number(rate.unitCosts?.input || 0);
          const profitRate =
            actualInputCost > 0 ? ((rate.inputRate * baseCreditPrice - actualInputCost) / actualInputCost) * 100 : 0;

          return (
            <Tooltip
              title={
                <Stack>
                  <Typography variant="caption">
                    <strong>{t('config.modelRates.configInfo.creditCost')}</strong>$
                    {formatSmallNumber(rate.inputRate * baseCreditPrice)}
                  </Typography>
                  <Typography variant="caption">
                    <strong>{t('config.modelRates.configInfo.actualCost')}</strong>${formatSmallNumber(actualInputCost)}
                  </Typography>
                  <Typography variant="caption">
                    <strong>{t('config.modelRates.configInfo.profitRate')}</strong>
                    {parseFloat(profitRate.toFixed(2))}%
                  </Typography>
                </Stack>
              }
              slotProps={{
                tooltip: {
                  sx: {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                  },
                },
              }}
              placement="bottom">
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="body2">{rate.inputRate}</Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: profitRate >= 0 ? 'success.main' : 'error.main',
                    display: 'block',
                  }}>
                  {profitRate >= 0 ? '+' : ''}
                  {profitRate === 0 ? '0' : parseFloat(profitRate.toFixed(2))}%
                </Typography>
              </Stack>
            </Tooltip>
          );
        },
      },
    },
    {
      name: 'outputRate',
      label: t('config.modelRates.fields.outputRate'),
      options: {
        customHeadLabelRender: () => {
          return (
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('config.modelRates.fields.outputRate')}
              <Tooltip title={t('config.modelRates.configInfo.outputTokenConsumption')}>
                <InfoOutlined sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Typography>
          );
        },
        customBodyRender: (_value: any, tableMeta: any) => {
          const rate = modelRates[tableMeta.rowIndex];
          if (!rate) return null;

          const actualOutputCost = Number(rate.unitCosts?.output || 0);
          const profitRate =
            actualOutputCost > 0
              ? ((rate.outputRate * baseCreditPrice - actualOutputCost) / actualOutputCost) * 100
              : 0;
          return (
            <Tooltip
              title={
                <Stack>
                  <Typography variant="caption">
                    <strong>{t('config.modelRates.configInfo.creditCost')}</strong>$
                    {formatSmallNumber(rate.outputRate * baseCreditPrice)}
                  </Typography>
                  <Typography variant="caption">
                    <strong>{t('config.modelRates.configInfo.actualCost')}</strong>$
                    {formatSmallNumber(actualOutputCost)}
                  </Typography>
                  <Typography variant="caption">
                    <strong>{t('config.modelRates.configInfo.profitRate')}</strong>
                    {parseFloat(profitRate.toFixed(2))}%
                  </Typography>
                </Stack>
              }
              placement="bottom"
              slotProps={{
                tooltip: {
                  sx: {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                  },
                },
              }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="body2">{rate.outputRate}</Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: profitRate >= 0 ? 'success.main' : 'error.main',
                    display: 'block',
                  }}>
                  {profitRate >= 0 ? '+' : ''}
                  {parseFloat(profitRate.toFixed(2))}%
                </Typography>
              </Stack>
            </Tooltip>
          );
        },
      },
    },
    {
      name: 'description',
      label: t('config.modelRates.fields.description'),
      options: {
        customBodyRender: (_value: any, tableMeta: any) => {
          const rate = modelRates[tableMeta.rowIndex];
          if (!rate) return null;

          return (
            <Typography
              variant="body2"
              noWrap
              sx={{
                color: 'text.secondary',
                maxWidth: 200,
              }}>
              {rate.description || '-'}
            </Typography>
          );
        },
      },
    },
    {
      name: 'actions',
      label: t('config.modelRates.fields.actions'),
      options: {
        customBodyRender: (_value: any, tableMeta: any) => {
          const rate = modelRates[tableMeta.rowIndex];
          if (!rate) return null;

          return (
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => handleEditRate(rate)} sx={{ minWidth: 'auto', px: 1 }}>
                {t('edit')}
              </Button>
              <Button
                size="small"
                onClick={() => handleDeleteClick(rate)}
                color="error"
                sx={{ minWidth: 'auto', px: 1 }}>
                {t('config.modelRates.actions.delete')}
              </Button>
            </Stack>
          );
        },
      },
    },
  ];

  return (
    <Box>
      {/* Configuration Info */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 1,
        }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 0 }}
          sx={{
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
          }}>
          <Box sx={{ flex: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                flexWrap: 'wrap',
              }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {t('config.modelRates.configInfo.title')}
              </Typography>
              <Tooltip
                title={<CreditRateFormula />}
                arrow
                placement="right"
                slotProps={{
                  tooltip: {
                    sx: {
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      boxShadow: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      width: 'fit-content',
                      minWidth: { xs: 'auto', sm: 500 },
                    },
                  },
                }}>
                <InfoOutlined
                  sx={{
                    fontSize: 16,
                    color: 'text.secondary',
                    cursor: 'help',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                />
              </Tooltip>
            </Stack>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}>
              1 AHC = ${formatSmallNumber(Number(baseCreditPrice))} • {t('config.modelRates.configInfo.profitMargin')}
              {targetProfitMargin}%
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            sx={{
              textTransform: 'none',
              fontWeight: 500,
            }}
            onClick={() => window.open('/.well-known/service/admin/overview/components', '_blank')}>
            {t('config.modelRates.configInfo.settingsLink')}
          </Button>
        </Stack>
      </Box>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}>
        <Typography variant="body1">{t('config.modelRates.description')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setShowForm(true);
            setEditingRate(null);
          }}>
          {t('config.modelRates.actions.add')}
        </Button>
      </Stack>
      <Root>
        <Table
          data={modelRates}
          columns={columns}
          toolbar={false}
          options={{
            elevation: 0,
            rowsPerPage: 10,
            rowsPerPageOptions: [10, 25, 50, 100],
          }}
          mobileTDFlexDirection="row"
          loading={loading}
        />
      </Root>
      {/* Add/Edit Model Rate Dialog */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        fullWidth
        maxWidth="sm"
        title={editingRate ? t('config.modelRates.actions.edit') : t('config.modelRates.actions.add')}>
        <ModelRateForm
          rate={editingRate}
          onSubmit={editingRate ? handleUpdateModelRate : handleCreateModelRate}
          onCancel={() => {
            setShowForm(false);
            setEditingRate(null);
          }}
        />
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title={t('config.modelRates.deleteDialog.title')}
        maxWidth="sm"
        PaperProps={{
          style: {
            minHeight: 'auto',
          },
        }}
        actions={
          <Stack
            direction="row"
            spacing={2}
            sx={{
              justifyContent: 'flex-end',
            }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>{t('config.modelRates.deleteDialog.cancel')}</Button>
            <Button variant="contained" color="error" onClick={handleDeleteRate}>
              {t('config.modelRates.deleteDialog.confirm')}
            </Button>
          </Stack>
        }>
        <Typography variant="body1">{t('config.modelRates.deleteDialog.message')}</Typography>
      </Dialog>
    </Box>
  );
}

const Root = styled(Box)`
  @media (max-width: ${({ theme }: { theme: any }) => theme.breakpoints.values.md}px) {
    .MuiTable-root > .MuiTableBody-root > .MuiTableRow-root > td.MuiTableCell-root {
      > div {
        width: fit-content;
        flex: inherit;
        font-size: 14px;
      }
    }
  }
`;
