-- Categories seed data
INSERT INTO
    "Category" ("id", "name", "parentId", "createdAt")
VALUES
    ('cat-sahumerios', 'Sahumerios', NULL, NOW ()),
    ('cat-saphirus', 'Saphirus', NULL, NOW ()),
    ('cat-bombas', 'Bombas', NULL, NOW ()),
    ('cat-difusores', 'Difusores', NULL, NOW ()),
    ('cat-cascadas', 'Cascadas', NULL, NOW ()),
    ('cat-conos', 'Conos', NULL, NOW ()),
    ('cat-escencias', 'Escencias', NULL, NOW ()),
    ('cat-ambar', 'Ambar', NULL, NOW ()),
    ('cat-textil', 'Textil', NULL, NOW ()),
    ('cat-velas', 'Velas', NULL, NOW ()),
    ('cat-accesorios', 'Accesorios', NULL, NOW ()),
    ('cat-tarot', 'Tarot', NULL, NOW ());

INSERT INTO
    "Category" ("id", "name", "parentId", "createdAt")
VALUES
    (
        'cat-sah-aromanza',
        'Aromanza',
        'cat-sahumerios',
        NOW ()
    ),
    (
        'cat-sah-sagrada',
        'Sagrada Madre',
        'cat-sahumerios',
        NOW ()
    ),
    (
        'cat-sah-iluminarte',
        'Iluminarte',
        'cat-sahumerios',
        NOW ()
    ),
    (
        'cat-sah-goloka',
        'Goloka',
        'cat-sahumerios',
        NOW ()
    ),
    (
        'cat-sah-triskel',
        'Triskel',
        'cat-sahumerios',
        NOW ()
    ),
    (
        'cat-sah-sree-vani',
        'Sree Vani',
        'cat-sahumerios',
        NOW ()
    ),
    (
        'cat-sah-alaaukik',
        'Alaaukik',
        'cat-sahumerios',
        NOW ()
    );

INSERT INTO
    "Category" ("id", "name", "parentId", "createdAt")
VALUES
    (
        'cat-saph-textiles',
        'Textiles',
        'cat-saphirus',
        NOW ()
    ),
    (
        'cat-saph-difusores',
        'Difusores',
        'cat-saphirus',
        NOW ()
    ),
    (
        'cat-saph-aerosoles',
        'Aerosoles',
        'cat-saphirus',
        NOW ()
    ),
    (
        'cat-saph-aceites',
        'Aceites Esenciales',
        'cat-saphirus',
        NOW ()
    );

INSERT INTO
    "Category" ("id", "name", "parentId", "createdAt")
VALUES
    (
        'cat-bom-aromanza',
        'Aromanza',
        'cat-bombas',
        NOW ()
    ),
    (
        'cat-bom-sagrada',
        'Sagrada Madre',
        'cat-bombas',
        NOW ()
    );

INSERT INTO
    "Category" ("id", "name", "parentId", "createdAt")
VALUES
    (
        'cat-dif-aromanza',
        'Aromanza',
        'cat-difusores',
        NOW ()
    );

INSERT INTO
    "Category" ("id", "name", "parentId", "createdAt")
VALUES
    (
        'cat-conos-aromanza',
        'Aromanza',
        'cat-conos',
        NOW ()
    );

INSERT INTO
    "Category" ("id", "name", "parentId", "createdAt")
VALUES
    (
        'cat-esc-aromanza',
        'Aromanza',
        'cat-escencias',
        NOW ()
    );

INSERT INTO
    "Category" ("id", "name", "parentId", "createdAt")
VALUES
    (
        'cat-velas-iluminarte',
        'Iluminarte',
        'cat-velas',
        NOW ()
    );