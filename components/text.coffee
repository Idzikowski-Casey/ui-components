import h from 'react-hyperscript'

Markdown = ({src, rest...})->
  h 'div', {dangerouslySetInnerHTML: {__html: src, rest...}}
