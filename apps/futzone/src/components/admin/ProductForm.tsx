'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Link2, Trash2 } from 'lucide-react';
import type { CategoryId, Product, ProductImage as Img, ProductInput, ProductStatus, ProductTag, Size } from '@/types/catalog';
import { ADULT_SIZES, ALL_SIZES, KIDS_SIZES } from '@/types/catalog';
import { categories } from '@/data/categories';
import { teams } from '@/data/teams';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { centsToInput, parsePrice, slugify } from '@/lib/format';
import { STATUS_META, TAG_LABEL } from '@/lib/productLabels';
import { teamById } from '@/lib/product';
import { Button, LinkButton } from '@/components/ui/Button';
import { Chip, Field, Input, Select, Textarea } from '@/components/ui/Form';
import { DemoNotice } from '@/components/ui/Feedback';
import { ProductImage } from '@/components/store/ProductImage';
import { Panel } from './AdminUI';

interface FormState {
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string;
  category: CategoryId;
  teamId: string;
  season: string;
  sizes: Size[];
  stock: Partial<Record<Size, string>>;
  images: Img[];
  status: ProductStatus;
  tags: ProductTag[];
}

type Errors = Partial<Record<keyof FormState, string>>;

const MAX_IMAGE_BYTES = 400 * 1024;

const fromProduct = (p?: Product): FormState => ({
  name: p?.name ?? '',
  slug: p?.slug ?? '',
  description: p?.description ?? '',
  price: centsToInput(p?.price),
  compareAtPrice: centsToInput(p?.compareAtPrice),
  category: p?.category ?? 'clubes',
  teamId: p?.teamId ?? teams[0].id,
  season: p?.season ?? '26/27',
  sizes: p?.sizes ?? [...ADULT_SIZES],
  stock: Object.fromEntries((p?.sizes ?? ADULT_SIZES).map((s) => [s, String(p?.stock[s] ?? 0)])),
  images: p?.images ?? [],
  status: p?.status ?? 'draft',
  tags: p?.tags ?? [],
});

/** Formulário de cadastro/edição de produto (dados locais). */
export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const { saveProduct, products } = useStoreData();
  const { notify } = useToast();
  const [form, setForm] = useState<FormState>(() => fromProduct(product));
  const [errors, setErrors] = useState<Errors>({});
  const [imageUrl, setImageUrl] = useState('');
  const [slugTouched, setSlugTouched] = useState(!!product);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const toggleSize = (s: Size) =>
    setForm((f) => {
      const sizes = f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : ALL_SIZES.filter((x) => x === s || f.sizes.includes(x));
      return { ...f, sizes, stock: { ...f.stock, [s]: f.stock[s] ?? '0' } };
    });

  const addImage = (src: string, alt = form.name) => {
    set('images', [...form.images, { src, alt }]);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('Selecione um arquivo de imagem.', 'warning');
    if (file.size > MAX_IMAGE_BYTES) return notify('Imagem acima de 400 KB. Use uma URL ou comprima o arquivo (armazenamento local limitado).', 'warning');
    const reader = new FileReader();
    reader.onload = () => addImage(String(reader.result), file.name);
    reader.readAsDataURL(file);
  };

  const validate = (): ProductInput | null => {
    const e: Errors = {};
    const price = parsePrice(form.price);
    const compare = form.compareAtPrice.trim() ? parsePrice(form.compareAtPrice) : undefined;
    const slug = slugify(form.slug || form.name);
    if (form.name.trim().length < 3) e.name = 'Informe o nome do produto (mín. 3 caracteres).';
    if (!slug) e.slug = 'URL inválida.';
    else if (products.some((p) => p.slug === slug && p.teamId === form.teamId && p.id !== product?.id)) e.slug = 'Já existe um produto deste time com esta URL.';
    if (form.description.trim().length < 10) e.description = 'Descreva o produto (mín. 10 caracteres).';
    if (!Number.isFinite(price) || price <= 0) e.price = 'Preço inválido. Ex.: 349,90';
    if (compare !== undefined && (!Number.isFinite(compare) || compare <= price)) e.compareAtPrice = 'O preço promocional exige um preço anterior maior que o preço atual.';
    if (form.sizes.length === 0) e.sizes = 'Selecione ao menos um tamanho.';
    if (form.sizes.some((s) => !/^\d+$/.test(form.stock[s] ?? ''))) e.stock = 'Estoque deve ser um número inteiro (0 ou mais).';
    setErrors(e);
    if (Object.keys(e).length) return null;

    const team = teamById(form.teamId);
    return {
      id: product?.id,
      name: form.name.trim(),
      slug,
      teamId: form.teamId,
      category: form.category,
      season: form.season.trim(),
      gender: form.sizes.every((s) => (KIDS_SIZES as Size[]).includes(s)) ? 'infantil' : form.category === 'femininas' ? 'feminino' : product?.gender ?? 'masculino',
      description: form.description.trim(),
      details: product?.details ?? ['Tecido leve e respirável', 'Escudo aplicado'],
      price,
      compareAtPrice: compare,
      sizes: form.sizes,
      stock: Object.fromEntries(form.sizes.map((s) => [s, Number(form.stock[s])])),
      images: form.images,
      palette: product?.palette ?? team?.colors ?? { primary: '#1f6bff', secondary: '#ffffff' },
      status: form.status,
      tags: form.tags,
    };
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const input = validate();
    if (!input) {
      notify('Revise os campos destacados.', 'warning');
      return;
    }
    const saved = saveProduct(input);
    notify(product ? `"${saved.name}" atualizado.` : `"${saved.name}" cadastrado.`);
    router.push('/admin/produtos');
  };

  const preview = { name: form.name || 'Novo produto', images: form.images, category: form.category, palette: product?.palette ?? teamById(form.teamId)?.colors ?? { primary: '#1f6bff', secondary: '#fff' } };

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Panel title="Informações">
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Field label="Nome" error={errors.name} className="sm:col-span-2">
              {(id, d) => (
                <Input
                  id={id}
                  aria-describedby={d}
                  aria-invalid={!!errors.name}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) }))}
                  placeholder="Camisa Flamengo 26/27 I"
                />
              )}
            </Field>
            <Field label="URL amigável" error={errors.slug} hint={`/camisas/${teamById(form.teamId)?.slug}/${slugify(form.slug || form.name) || '…'}`} className="sm:col-span-2">
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.slug} value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />}
            </Field>
            <Field label="Descrição" error={errors.description} className="sm:col-span-2">
              {(id, d) => <Textarea id={id} aria-describedby={d} aria-invalid={!!errors.description} value={form.description} onChange={(e) => set('description', e.target.value)} />}
            </Field>
            <Field label="Categoria">
              {(id) => (
                <Select id={id} value={form.category} onChange={(e) => {
                  const category = e.target.value as CategoryId;
                  const kids = category === 'kits';
                  const sizes = kids ? [...KIDS_SIZES] : [...ADULT_SIZES];
                  setForm((f) => ({ ...f, category, sizes, stock: Object.fromEntries(sizes.map((s) => [s, f.stock[s] ?? '0'])) }));
                }}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Time">
              {(id) => (
                <Select id={id} value={form.teamId} onChange={(e) => set('teamId', e.target.value)}>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Temporada" error={errors.season}>
              {(id, d) => <Input id={id} aria-describedby={d} value={form.season} onChange={(e) => set('season', e.target.value)} placeholder="26/27" />}
            </Field>
          </div>
        </Panel>

        <Panel title="Preço">
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <Field label="Preço (R$)" error={errors.price} hint="Valor cobrado do cliente.">
              {(id, d) => <Input id={id} inputMode="decimal" aria-describedby={d} aria-invalid={!!errors.price} value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="349,90" />}
            </Field>
            <Field label="Preço anterior (R$)" error={errors.compareAtPrice} hint="Opcional. Quando maior que o preço, o produto aparece em promoção.">
              {(id, d) => <Input id={id} inputMode="decimal" aria-describedby={d} aria-invalid={!!errors.compareAtPrice} value={form.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} placeholder="399,90" />}
            </Field>
          </div>
        </Panel>

        <Panel title="Tamanhos e estoque">
          <div className="space-y-5 p-5">
            {[{ label: 'Adulto', sizes: ADULT_SIZES }, { label: 'Infantil', sizes: KIDS_SIZES }].map((g) => (
              <div key={g.label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-2">{g.label}</p>
                <div className="flex flex-wrap gap-2">
                  {g.sizes.map((s) => (
                    <Chip key={s} selected={form.sizes.includes(s)} onClick={() => toggleSize(s)} className="min-w-11">{s}</Chip>
                  ))}
                </div>
              </div>
            ))}
            {errors.sizes && <p className="text-xs text-danger">{errors.sizes}</p>}
            {form.sizes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-2">Estoque por tamanho</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {form.sizes.map((s) => (
                    <label key={s} className="flex flex-col gap-1">
                      <span className="text-center text-xs font-bold text-brand-300">{s}</span>
                      <Input type="number" min={0} inputMode="numeric" className="text-center" aria-label={`Estoque tamanho ${s}`} aria-invalid={!!errors.stock && !/^\d+$/.test(form.stock[s] ?? '')} value={form.stock[s] ?? ''} onChange={(e) => set('stock', { ...form.stock, [s]: e.target.value })} />
                    </label>
                  ))}
                </div>
                {errors.stock && <p className="mt-2 text-xs text-danger">{errors.stock}</p>}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Imagens">
          <div className="space-y-4 p-5">
            <DemoNotice>Sem imagens cadastradas, a loja exibe um placeholder ilustrativo nas cores do time. Use somente fotos reais e autorizadas do produto.</DemoNotice>
            {form.images.length > 0 && (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {form.images.map((img, i) => (
                  <li key={img.src.slice(0, 64) + i} className="group relative overflow-hidden rounded-xl border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={img.alt} className="aspect-[4/5] w-full bg-surface-2 object-contain" />
                    {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-brand-500 px-1.5 text-[0.6rem] font-bold uppercase text-white">Capa</span>}
                    <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-lg bg-black/70 text-white hover:bg-danger" aria-label={`Remover imagem ${i + 1}`}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input className="pl-10" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://… URL da imagem" aria-label="URL da imagem" />
              </div>
              <Button variant="secondary" onClick={() => {
                if (!/^https?:\/\/\S+$/i.test(imageUrl.trim())) return notify('Informe uma URL de imagem válida (http/https).', 'warning');
                addImage(imageUrl.trim());
                setImageUrl('');
              }}>Adicionar URL</Button>
              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-4 text-xs font-bold uppercase tracking-wider text-fg-2 hover:border-brand-500 hover:text-brand-300">
                <ImagePlus className="size-4" /> Enviar arquivo
                <input type="file" accept="image/*" className="sr-only" onChange={onFile} />
              </label>
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <Panel title="Publicação">
          <div className="space-y-4 p-5">
            <div className="grid gap-2" role="radiogroup" aria-label="Status de publicação">
              {(Object.keys(STATUS_META) as ProductStatus[]).map((s) => (
                <Chip key={s} role="radio" aria-checked={form.status === s} selected={form.status === s} onClick={() => set('status', s)} className="h-10 justify-start px-4">
                  {STATUS_META[s].label}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-muted">Apenas produtos publicados aparecem na loja.</p>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-2">Destaques</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TAG_LABEL) as ProductTag[]).map((t) => (
                  <Chip key={t} selected={form.tags.includes(t)} onClick={() => set('tags', form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t])}>
                    {TAG_LABEL[t]}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="Pré-visualização">
          <div className="p-5">
            <ProductImage product={preview} className="aspect-[4/5] w-full rounded-xl border border-line" />
            <p className="mt-3 font-semibold">{preview.name}</p>
            <p className="text-sm text-brand-300">{Number.isFinite(parsePrice(form.price)) ? `R$ ${form.price}` : '—'}</p>
          </div>
        </Panel>
        <div className="flex gap-3">
          <LinkButton href="/admin/produtos" variant="secondary" className="flex-1">Cancelar</LinkButton>
          <Button type="submit" className="flex-1">{product ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </div>
    </form>
  );
}
