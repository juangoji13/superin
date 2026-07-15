-- Insertar cuentas bancarias por defecto para transferencias en la tabla de configuración
INSERT INTO public.configuracion (clave, valor)
VALUES (
    'datos_transferencia',
    '{"bancos": [{"banco": "Nequi", "numero": "3001234567", "titular": "Super IN"}, {"banco": "Bancolombia", "numero": "Ahorros 123-456789-01", "titular": "Super IN SAS"}]}'::jsonb
)
ON CONFLICT (clave) DO NOTHING;
