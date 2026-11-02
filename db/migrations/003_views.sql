-- Fact rows with readable names, so queries can filter without repeating joins.
CREATE VIEW v_business_weekly AS
SELECT
  f.week_start,
  b.name AS brand,
  m.name AS market,
  f.revenue,
  f.units_sold,
  f.is_promotion,
  f.price_index,
  f.distribution_pct,
  f.distribution_is_imputed,
  f.competitor_price_index,
  f.economic_index
FROM fact_business_weekly f
JOIN brand b ON b.id = f.brand_id
JOIN market m ON m.id = f.market_id;

CREATE VIEW v_media_detail AS
SELECT
  f.week_start,
  b.name AS brand,
  m.name AS market,
  c.name AS channel,
  c.channel_type,
  f.media_spend,
  f.spend_is_imputed,
  f.impressions,
  f.clicks,
  f.tv_grps
FROM fact_media_weekly f
JOIN brand b ON b.id = f.brand_id
JOIN market m ON m.id = f.market_id
JOIN channel c ON c.id = f.channel_id;
