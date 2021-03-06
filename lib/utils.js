if (typeof module === 'object' && typeof define !== 'function') {
  var define = function(factory) {
    module.exports = factory(require, exports, module);
  };
}

define(function(require, exports, module){
  var utils = module.exports = {};
  var regs = {
    dereferenceOperators: /[-#=]+>+/g
  , endsInCast: /::\w+$/
  };

  utils.parameterize = function(value, values){
    if (typeof value == 'boolean') return value ? 'true' : 'false';
    if (value[0] != '$') return '$' + values.push(value);
    if (value[value.length - 1] != '$') return '$' + values.push(value);
    return utils.quoteColumn(value.substring(1, value.length - 1));
  };

  utils.quoteColumn =  function(field, collection){
    var period;

    // They're casting
    if ( regs.endsInCast.test( field ) ){
      return utils.quoteColumn(
        field.replace( regs.endsInCast, '' )
      , collection
      ) + field.match( regs.endsInCast )[0];
    }

    // They're using JSON/Hstore operators
    if ( regs.dereferenceOperators.test( field ) ){
      var operators = field.match( regs.dereferenceOperators );

      // Split on operators
      return field.split(
        regs.dereferenceOperators
      // Properly quote each part
      ).map( function( part, i ){
        if ( i === 0 ) return utils.quoteColumn( part, collection );

        if ( Number.isNaN( parseInt( part ) ) && part.indexOf("'") === -1 ){
          return "'" + part + "'";
        }

        return part;
      // Re-join fields and operators
      }).reduce( function( a, b, i ){
        return [ a, b ].join( operators[ i - 1 ] );
      });
    }

    // Just using *, no collection
    if (field.indexOf('*') == 0 && collection)
      return '"' + collection + '".*';

    // Using *, specified collection, used quotes
    else if (field.indexOf('".*') > -1)
      return field;

    // Using *, specified collection, didn't use quotes
    else if (field.indexOf('.*') > -1)
      return '"' + field.split('.')[0] + '".*';

    // They already quoted both and specified
    else if (field.indexOf('"."') > -1)
      return field;

    // They quoted collection, but not field
    else if ((period = field.indexOf('".')) > -1)
      return field.substring(0, period + 2) + '"' + field.substring(period + 2) + '"';

    // Included collection, but didn't quote anything
    else if ((period = field.indexOf(".")) > -1)
      return '"' + field.substring(0, period) + '"."' + field.substring(period + 1) + '"'

    // Didn't include collection, but did quote
    else if (field.indexOf('"') > -1 && collection)
      return '"' + collection + '".' + field;

    // No collection, no quotes
    else if (collection) {
      //if collection is already quoted, do not append more quotes
      if (collection.indexOf('"') > -1) {
        return collection + '."' + field + '"';
      }
      return '"' + collection + '"."' + field + '"';
    }

    // No collection, no quotes and no collection provided
    else
      return '"' + field + '"';
  };

  utils.quoteValue = function(value){
    var num = parseInt(value), isNum = (typeof num == 'number' && (num < 0 || num > 0));
    return isNum ? value : "$$" + value + "$$";
  };

  /**
   * Returns a function that when called, will call the
   * passed in function with a specific set of arguments
   */
  utils.with = function(fn){
    var args = Array.prototype.slice.call(arguments, 1);
    return function(){ fn.apply({}, args); };
  };


  return module.exports;
});
