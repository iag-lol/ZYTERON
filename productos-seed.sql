-- Script SQL para insertar productos de tecnología (Notebooks, PCs, Periféricos, etc.)
-- OJO: Incluye el margen del 25% sobre el costo. 
-- Ejecuta este script directamente en el editor SQL de Supabase.

BEGIN;

-- 1. Insertar las categorías base si no existen
INSERT INTO "ProductCategory" (id, slug, name, "order")
VALUES
('cat-ti-notebooks', 'notebooks', 'Notebooks', 10),
('cat-ti-pcs', 'pc-escritorio', 'PC Escritorio', 20),
('cat-ti-combos', 'combos-empresa', 'Combos Empresa', 30),
('cat-ti-perifericos', 'perifericos', 'Periféricos / Oficina', 40),
('cat-ti-redes', 'redes', 'Redes y Conectividad', 50)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insertar los productos en la tabla principal "Product"
INSERT INTO "Product" (id, slug, name, description, price, "discountPct", stock, featured, "categoryId", "createdAt")
VALUES
('prod-uuid-01', 'notebook-lenovo-ideapad-3-basico', 'Notebook Lenovo IdeaPad 3 - Básico', 'Notebook ideal para tareas básicas de oficina y navegación. Intel Celeron, 8GB RAM, 256GB SSD.', 312500, 0, 15, false, 'cat-ti-notebooks', now()),
('prod-uuid-02', 'notebook-hp-pavilion-i5', 'Notebook HP Pavilion (Core i5) - Medio', 'Equipo de rendimiento intermedio para multitareas y trabajo administrativo fluido. Intel Core i5, 16GB RAM, 512GB SSD.', 562500, 0, 12, true, 'cat-ti-notebooks', now()),
('prod-uuid-03', 'notebook-dell-xps-15-avanzado', 'Notebook Dell XPS 15 - Avanzado', 'Estación de trabajo portátil de alto rendimiento para desarrolladores y creativos. Intel Core i7, 32GB RAM, 1TB SSD.', 1500000, 0, 5, false, 'cat-ti-notebooks', now()),
('prod-uuid-04', 'macbook-pro-14-m3-gerencia', 'MacBook Pro 14" M3 - Gerencial', 'Diseño premium y máxima eficiencia para perfiles gerenciales y directivos. Chip M3, 18GB RAM, 512GB SSD.', 2250000, 0, 3, true, 'cat-ti-notebooks', now()),

('prod-uuid-05', 'pc-escritorio-basico-oficina', 'PC de Escritorio Básico - Oficina', 'Computador de escritorio torre para tareas administrativas estándar. Incluye Windows 11 Pro.', 250000, 0, 20, false, 'cat-ti-pcs', now()),
('prod-uuid-06', 'workstation-avanzada-diseno', 'Estación de Trabajo (Workstation) - Avanzada', 'Computador de escritorio de alto rendimiento para renderizado, diseño 3D y análisis de datos.', 1125000, 0, 5, true, 'cat-ti-pcs', now()),

('prod-uuid-07', 'monitor-24-pulgadas-basico', 'Monitor 24" FHD (Samsung/LG) - Básico', 'Monitor estándar para oficina, resolución Full HD 1080p, protección ocular.', 100000, 0, 25, false, 'cat-ti-perifericos', now()),
('prod-uuid-08', 'monitor-27-pulgadas-avanzado', 'Monitor 27" 4K Profesional (Dell/Asus)', 'Monitor de alta resolución para profesionales de diseño y programación.', 200000, 0, 10, false, 'cat-ti-perifericos', now()),

('prod-uuid-09', 'pack-teclado-mouse-basico', 'Pack Teclado y Mouse Inalámbrico - Básico', 'Combo Logitech básico, confiable y con gran duración de batería.', 200000, 0, 40, false, 'cat-ti-perifericos', now()),
('prod-uuid-10', 'silla-ergonomica-gerencial', 'Silla Ergonómica Ejecutiva - Gerencia', 'Silla de oficina premium con soporte lumbar ajustable y reposacabezas.', 150000, 0, 8, true, 'cat-ti-perifericos', now())
ON CONFLICT (slug) DO NOTHING;

-- 3. Insertar la Metadata de imágenes y costos (En la tabla "Setting")
-- Nota: En Postgres JSON se escapa usando comillas dobles normales, las comillas simples de SQL envuelven el string completo.

INSERT INTO "Setting" (id, key, value, type)
VALUES
-- Producto 01: Notebook Básico
(gen_random_uuid()::text, 'product_public_notebook-lenovo-ideapad-3-basico', '{"slug":"notebook-lenovo-ideapad-3-basico","imageUrl":"https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80","publicDescription":"Notebook ideal para tareas básicas de oficina.","published":true}', 'JSON'),
(gen_random_uuid()::text, 'product_admin_notebook-lenovo-ideapad-3-basico', '{"slug":"notebook-lenovo-ideapad-3-basico","status":"ACTIVE","soldUnits":0,"onOffer":false,"isCombo":false,"costPrice":250000}', 'JSON'),

-- Producto 02: Notebook Medio
(gen_random_uuid()::text, 'product_public_notebook-hp-pavilion-i5', '{"slug":"notebook-hp-pavilion-i5","imageUrl":"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80","publicDescription":"Rendimiento intermedio ideal para trabajo fluido.","published":true}', 'JSON'),
(gen_random_uuid()::text, 'product_admin_notebook-hp-pavilion-i5', '{"slug":"notebook-hp-pavilion-i5","status":"ACTIVE","soldUnits":0,"onOffer":false,"isCombo":false,"costPrice":450000}', 'JSON'),

-- Producto 03: Notebook Avanzado
(gen_random_uuid()::text, 'product_public_notebook-dell-xps-15-avanzado', '{"slug":"notebook-dell-xps-15-avanzado","imageUrl":"https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80","publicDescription":"Estación de trabajo portátil de alto rendimiento.","published":true}', 'JSON'),
(gen_random_uuid()::text, 'product_admin_notebook-dell-xps-15-avanzado', '{"slug":"notebook-dell-xps-15-avanzado","status":"ACTIVE","soldUnits":0,"onOffer":false,"isCombo":false,"costPrice":1200000}', 'JSON'),

-- Producto 04: Notebook Gerente
(gen_random_uuid()::text, 'product_public_macbook-pro-14-m3-gerencia', '{"slug":"macbook-pro-14-m3-gerencia","imageUrl":"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80","publicDescription":"MacBook Pro diseñado para máxima eficiencia gerencial.","published":true}', 'JSON'),
(gen_random_uuid()::text, 'product_admin_macbook-pro-14-m3-gerencia', '{"slug":"macbook-pro-14-m3-gerencia","status":"ACTIVE","soldUnits":0,"onOffer":false,"isCombo":false,"costPrice":1800000}', 'JSON'),

-- Producto 05: PC Escritorio
(gen_random_uuid()::text, 'product_public_pc-escritorio-basico-oficina', '{"slug":"pc-escritorio-basico-oficina","imageUrl":"https://images.unsplash.com/photo-1587202372775-e229f172b9d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80","publicDescription":"Torre de escritorio básica y económica.","published":true}', 'JSON'),
(gen_random_uuid()::text, 'product_admin_pc-escritorio-basico-oficina', '{"slug":"pc-escritorio-basico-oficina","status":"ACTIVE","soldUnits":0,"onOffer":false,"isCombo":false,"costPrice":200000}', 'JSON'),

-- Producto 06: Workstation
(gen_random_uuid()::text, 'product_public_workstation-avanzada-diseno', '{"slug":"workstation-avanzada-diseno","imageUrl":"https://images.unsplash.com/photo-1587202372634-32705e3bf49c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80","publicDescription":"Workstation de alto rendimiento para diseño.","published":true}', 'JSON'),
(gen_random_uuid()::text, 'product_admin_workstation-avanzada-diseno', '{"slug":"workstation-avanzada-diseno","status":"ACTIVE","soldUnits":0,"onOffer":false,"isCombo":false,"costPrice":900000}', 'JSON'),

-- Producto 07: Monitor 24
(gen_random_uuid()::text, 'product_public_monitor-24-pulgadas-basico', '{"slug":"monitor-24-pulgadas-basico","imageUrl":"https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80","publicDescription":"Monitor estándar 24 pulgadas FHD.","published":true}', 'JSON'),
(gen_random_uuid()::text, 'product_admin_monitor-24-pulgadas-basico', '{"slug":"monitor-24-pulgadas-basico","status":"ACTIVE","soldUnits":0,"onOffer":false,"isCombo":false,"costPrice":80000}', 'JSON'),

-- Producto 08: Monitor 27
(gen_random_uuid()::text, 'product_public_monitor-27-pulgadas-avanzado', '{"slug":"monitor-27-pulgadas-avanzado","imageUrl":"https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80","publicDescription":"Monitor 27 pulgadas 4K para creativos.","published":true}', 'JSON'),
(gen_random_uuid()::text, 'product_admin_monitor-27-pulgadas-avanzado', '{"slug":"monitor-27-pulgadas-avanzado","status":"ACTIVE","soldUnits":0,"onOffer":false,"isCombo":false,"costPrice":160000}', 'JSON'),

-- Producto 09: Teclado Mouse
(gen_random_uuid()::text, 'product_public_pack-teclado-mouse-basico', '{"slug":"pack-teclado-mouse-basico","imageUrl":"https://images.unsplash.com/photo-1595225476474-87563907a212?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80","publicDescription":"Pack clásico teclado y mouse inalámbrico.","published":true}', 'JSON'),
(gen_random_uuid()::text, 'product_admin_pack-teclado-mouse-basico', '{"slug":"pack-teclado-mouse-basico","status":"ACTIVE","soldUnits":0,"onOffer":false,"isCombo":true,"comboLabel":"Incluye Pilas","costPrice":16000}', 'JSON'),

-- Producto 10: Silla
(gen_random_uuid()::text, 'product_public_silla-ergonomica-gerencial', '{"slug":"silla-ergonomica-gerencial","imageUrl":"https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80","publicDescription":"Silla ergonómica de nivel gerencial.","published":true}', 'JSON'),
(gen_random_uuid()::text, 'product_admin_silla-ergonomica-gerencial', '{"slug":"silla-ergonomica-gerencial","status":"ACTIVE","soldUnits":0,"onOffer":false,"isCombo":false,"costPrice":120000}', 'JSON')

ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;

COMMIT;
