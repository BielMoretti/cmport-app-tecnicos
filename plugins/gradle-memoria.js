// Aumenta a memória do Gradle no build do Android. Com o R8 ligado (minificação do código de release), o
// padrão do template (2 GB) estourou no build do APK ("R8: java.lang.OutOfMemoryError: Java heap space").
const { withGradleProperties } = require('expo/config-plugins');

const JVMARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';

module.exports = function withGradleMemoria(config) {
  return withGradleProperties(config, c => {
    c.modResults = c.modResults.filter(item => !(item.type === 'property' && item.key === 'org.gradle.jvmargs'));
    c.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value: JVMARGS });
    return c;
  });
};
