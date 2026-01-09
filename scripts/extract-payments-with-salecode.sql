-- Query para extraer payments con saleCode en lugar de relatedEntityId
-- El saleCode viene de sales.metadata->>'Codigo'

SELECT
    jsonb_agg(
        jsonb_build_object(
            'methodPayment', p."methodPayment",
            'amount', p.amount,
            'relatedEntityType', p."relatedEntityType",
            'saleCode', s.metadata->>'Codigo',  -- ← AQUÍ obtenemos el código de la venta
            'metadata', p.metadata,
            'dateOperation', p."dateOperation",
            'numberTicket', p."numberTicket",
            'userId', p.user_id,
            'paymentDetails', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'bankName', pd."bankName",
                        'transactionReference', pd."transactionReference",
                        'codeOperation', pd."codeOperation",
                        'transactionDate', pd."transactionDate",
                        'amount', pd.amount,
                        'url', pd.url,
                        'urlKey', pd."urlKey"
                    )
                )
                FROM payment_details pd
                WHERE pd.payment_id = p.id
                AND pd."isActive" = true
            )
        )
    ) as payments_array
FROM payments p
INNER JOIN financing f ON f.id = p."relatedEntityId"::uuid
INNER JOIN sales s ON s.id = f.sale_id
WHERE p."createdAt" >= CURRENT_DATE - INTERVAL '1 day'
AND p.status = 'APPROVED'
AND p."relatedEntityType" = 'financingInstallments';
