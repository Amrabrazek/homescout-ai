import { Plus, Minus, X } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

import IconButton from './icon-button';

const ImageLightbox = ({
  index,
  images,
  isOpen,
  onClose,
}: {
  index: number;
  images: string[];
  isOpen?: boolean;
  onClose?: () => void;
}) => {
  return (
    <Lightbox
      index={index}
      plugins={[Thumbnails, Zoom]}
      open={isOpen}
      close={onClose}
      slides={images.map((image) => ({
        src: image,
      }))}
      render={{
        iconClose: () => (
          <IconButton className='border-0 bg-transparent'>
            <X />
          </IconButton>
        ),
        iconZoomIn: () => (
          <IconButton className='border-0 bg-transparent'>
            <Plus />
          </IconButton>
        ),
        iconZoomOut: () => (
          <IconButton className='border-0 bg-transparent'>
            <Minus />
          </IconButton>
        ),
      }}
      thumbnails={{
        width: 48,
        height: 48,
        borderRadius: 6,
        padding: 0,
        border: 1,
        gap: 10,
        imageFit: 'cover',
        borderColor: 'transparent',
      }}
      styles={{
        container: {
          background: '#fff',
        },
        button: {
          padding: 0,
          boxShadow: 'none',
          filter: 'none',
        },
        thumbnailsContainer: {
          background: '#fff',
        },
        slide: {
          paddingBottom: 0,
          paddingRight: 0,
          paddingLeft: 0,
          paddingTop: 54,
        },
      }}
    />
  );
};

export default ImageLightbox;
