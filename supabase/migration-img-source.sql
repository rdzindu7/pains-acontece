-- Campo opcional para origem da imagem do artigo
ALTER TABLE articles ADD COLUMN IF NOT EXISTS img_source TEXT;