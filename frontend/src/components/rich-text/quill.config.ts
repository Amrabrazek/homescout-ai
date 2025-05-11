import { z } from 'zod';

const QuillConfigSchema = z.object({
  theme: z.enum(['snow', 'bubble']),
  modules: z.object({
    toolbar: z.array(
      z.union([
        z.array(
          z.union([
            z.string(),
            z.object({
              header: z.array(z.union([z.number(), z.literal(false)])),
            }),
            z.object({
              list: z.enum(['ordered', 'bullet']),
            }),
            z.object({
              indent: z.enum(['-1', '+1']),
            }),
            z.object({
              color: z.array(z.string()).optional(),
            }),
          ])
        ),
        z.string(),
      ])
    ),
    blotFormatter: z.object({}),
    // imageResize: z.object({ displaySize: z.boolean() }),
  }),
  placeholder: z.string(),
  formats: z.array(z.string()),
});

const quillConfig = QuillConfigSchema.parse({
  theme: 'snow',
  modules: {
    toolbar: [
      [{ header: [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'blockquote'],
      [{ color: [] }],
      [
        { list: 'ordered' },
        { list: 'bullet' },
        { indent: '-1' },
        { indent: '+1' },
      ],
      ['link', 'image'],
      ['clean'],
    ],
    blotFormatter: {},
  },
  placeholder: '',
  formats: [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'list',
    'indent',
    'link',
    'image',
    'color',
  ],
});

export default quillConfig;
