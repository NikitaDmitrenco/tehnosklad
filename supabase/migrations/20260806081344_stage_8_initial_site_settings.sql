-- Required public contact settings for a first production deployment.
-- Existing owner-managed settings are deliberately preserved.
insert into public.site_settings (key, locale, value) values
  ('phone_display', 'ru', '+373 69 166 172'),
  ('phone_display', 'ro', '+373 69 166 172'),
  ('phone_href', 'ru', 'tel:+37369166172'),
  ('phone_href', 'ro', 'tel:+37369166172'),
  ('address', 'ru', 'ул. Победы, 97, Комрат'),
  ('address', 'ro', 'str. Victoriei, 97, Comrat'),
  ('open_days', 'ru', 'Вторник–воскресенье'),
  ('open_days', 'ro', 'Marți–duminică'),
  ('open_time', 'ru', '08:00–16:00'),
  ('open_time', 'ro', '08:00–16:00'),
  ('closed_day', 'ru', 'Понедельник — выходной'),
  ('closed_day', 'ro', 'Luni — zi liberă'),
  ('contact_text', 'ru', 'Позвоните нам в часы работы магазина.'),
  ('contact_text', 'ro', 'Sunați-ne în programul magazinului.')
on conflict (key, locale) do nothing;
