'use client';

import { useEffect, useRef } from 'react';
import { useQuill } from 'react-quilljs';
import quillConfig from './quill.config';
import './quill.css';
import 'quill-blot-formatter';

export const RichTextFormFiled = (props: {
  description?: string;
  changeFunc: (description: string) => void;
}) => {
  const { quill, quillRef, Quill } = useQuill({
    theme: quillConfig.theme,
    modules: quillConfig.modules,
    formats: quillConfig.formats,
    placeholder: quillConfig.placeholder,
  });

  useEffect(() => {
    if (quill) {
      // Only update the editor if the description content has changed
      const currentContent = quill.root.innerHTML;
      if (props.description !== currentContent) {
        quill.clipboard.dangerouslyPasteHTML(props.description ?? '');
      }

      // Add the text-change listener to trigger changeFunc
      quill.on('text-change', () => {
        props.changeFunc(
          quill.root.innerHTML === '<p><br></p>' ? '' : quill.root.innerHTML
        );
      });
    }
  }, [quill, props.description]);

  useEffect(() => {
    if (quill) {
      // Ensure the cursor position is preserved after initialization
      quill.blur();
    }
  }, [quill]);

  return <div ref={quillRef} />;
};

export const RichTextFormFiledWithoutImage = (props: {
  value?: string;
  changeFunc: (description: string) => void;
  quillConfig: any;
}) => {
  const { quill, quillRef, Quill } = useQuill({
    theme: props.quillConfig.theme,
    modules: props.quillConfig.modules,
    formats: props.quillConfig.formats,
    placeholder: props.quillConfig.placeholder,
  });

  useEffect(() => {
    if (quill) {
      quill.clipboard.dangerouslyPasteHTML(props.value ?? '');
      // Add an event listener for text-change to log the quill instance whenever it changes
      quill.on('text-change', () => {
        props.changeFunc(quill.root.innerHTML);
      });
      quill.root.blur();
    }
  }, [quill]);

  return <div ref={quillRef} />;
};
